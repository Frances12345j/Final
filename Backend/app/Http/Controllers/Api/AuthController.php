<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Mail\PasswordResetMail;
use App\Models\PasswordReset;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'username' => 'required|string',
            'password' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $user = User::where(function ($query) use ($request) {
                $query->where('username', $request->username)
                    ->orWhere('email', $request->username);
            })
            ->first();

        if (!$user) {
            return response()->json([
                'message' => 'This account has not been created yet.',
                'error' => 'account_not_found',
            ], 401);
        }

        if (!Hash::check($request->password, $user->password)) {
            return response()->json(['message' => 'Incorrect password. Please try again.'], 401);
        }

        if (!$user->is_active) {
            return response()->json(['message' => 'Your account has been Disabled or invalid Credentials.'], 401);
        }

        $mobileRoles = [User::ROLE_STAFF, User::ROLE_RIDER, User::ROLE_CUSTOMER];
        if (! in_array($user->role, $mobileRoles, true)) {
            return response()->json([
                'message' => 'This account is not authorized for mobile access.',
            ], 403);
        }

        $mobileUserType = match ($user->role) {
            User::ROLE_RIDER => 'rider',
            User::ROLE_CUSTOMER => 'customer',
            default => 'staff',
        };

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'user' => array_merge($user->load('branchAssignments.branch')->toArray(), [
                'user_type' => $mobileUserType,
            ]),
            'token' => $token,
            'role' => $user->role,
            'user_type' => $mobileUserType,
        ]);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();
        return response()->json(['message' => 'Logged out successfully']);
    }

    public function me(Request $request)
    {
        $user = $request->user()->load('branchAssignments.branch');
        return response()->json($user);
    }

    public function updateProfile(Request $request)
    {
        $validated = $request->validate([
            'firstname' => 'required|string|max:255',
            'lastname' => 'required|string|max:255',
            'middlename' => 'nullable|string|max:255',
            'address' => 'nullable|string',
            'phone' => 'nullable|string|max:20',
            'email' => [
                'nullable', 'string', 'email', 'max:255',
                Rule::unique('users', 'email')->ignore($request->user()->id),
            ],
        ]);

        $user = $request->user();
        $user->update($validated);

        return response()->json($user->load('branchAssignments.branch'));
    }

    public function updateAvatar(Request $request)
    {
        $request->validate([
            'avatar' => ['required', 'image', 'mimes:jpeg,jpg,png,webp,gif', 'max:5120'],
        ]);

        $user = $request->user();

        if ($request->hasFile('avatar')) {
            $old = $user->avatar;
            $path = $request->file('avatar')->store('avatars', 'public');

            if ($old && $old !== $path) {
                Storage::disk('public')->delete($old);
            }

            $user->avatar = $path;
            $user->save();
        }

        return response()->json($user->load('branchAssignments.branch'));
    }

    /**
     * Step 1 — request a password reset OTP (sent to the registered email).
     */
    public function forgotPassword(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'email' => ['required', 'string', 'email'],
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $user = User::where('email', $request->email)
            ->whereIn('role', [User::ROLE_STAFF, User::ROLE_RIDER, User::ROLE_CUSTOMER])
            ->first();

        if (!$user) {
            return response()->json([
                'message' => 'No account found with that email address.',
            ], 404);
        }

        $otp = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);

        // Invalidate any previous reset requests for this email
        PasswordReset::where('email', $user->email)
            ->where('used', false)
            ->update(['used' => true]);

        PasswordReset::create([
            'email' => $user->email,
            'otp' => $otp,
            'expires_at' => now()->addMinutes(10),
        ]);

        Mail::to($user->email)
            ->send(new PasswordResetMail($otp, $user->firstname));

        return response()->json([
            'message' => 'An OTP code has been sent to your email.',
            'email' => $this->maskEmail($user->email),
            'expires_in' => 10,
        ]);
    }

    /**
     * Step 2 — verify the emailed OTP and issue a temporary reset token.
     */
    public function verifyOtp(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'email' => ['required', 'string', 'email'],
            'otp' => ['required', 'string', 'size:6'],
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $reset = PasswordReset::where('email', $request->email)
            ->where('otp', $request->otp)
            ->where('used', false)
            ->where('expires_at', '>', now())
            ->latest()
            ->first();

        if (!$reset) {
            return response()->json([
                'message' => 'The OTP code is invalid or has expired. Please request a new one.',
            ], 422);
        }

        $reset->update([
            'used' => true,
            'reset_token' => $token = Str::random(64),
            'expires_at' => now()->addMinutes(15),
        ]);

        return response()->json([
            'message' => 'OTP verified successfully.',
            'reset_token' => $token,
            'expires_in' => 15,
        ]);
    }

    /**
     * Step 3 — set a new password using the verified reset token.
     */
    public function resetPassword(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'email' => ['required', 'string', 'email'],
            'reset_token' => ['required', 'string'],
            'password' => ['required', 'confirmed', Password::min(8)],
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $reset = PasswordReset::where('email', $request->email)
            ->where('reset_token', $request->reset_token)
            ->where('expires_at', '>', now())
            ->latest()
            ->first();

        if (!$reset) {
            return response()->json([
                'message' => 'Invalid or expired reset token. Please request a new OTP.',
            ], 422);
        }

        $user = User::where('email', $request->email)->first();

        if (!$user) {
            return response()->json([
                'message' => 'No account found with that email address.',
            ], 404);
        }

        $user->password = $request->password;
        $user->save();

        // Invalidate every reset request for this email
        PasswordReset::where('email', $user->email)->update(['used' => true]);

        return response()->json([
            'message' => 'Your password has been reset successfully. You can now sign in.',
        ]);
    }

    private function maskEmail(string $email): string
    {
        [$local, $domain] = explode('@', $email, 2);

        $masked = strlen($local) > 2
            ? substr($local, 0, 2) . str_repeat('*', max(1, strlen($local) - 2))
            : ($local[0] ?? '*') . '*';

        return $masked . '@' . $domain;
    }
}

