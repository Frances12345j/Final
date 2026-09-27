<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;

class UserController extends Controller
{
    public function index(Request $request)
    {
        $query = User::query()
            ->whereIn('role', [User::ROLE_STAFF, User::ROLE_RIDER, User::ROLE_CUSTOMER])
            ->with(['branchAssignments' => function ($q) {
                $q->where('is_active', true);
            }, 'branchAssignments.branch']);

        if ($request->filled('role') && in_array($request->role, [User::ROLE_STAFF, User::ROLE_RIDER, User::ROLE_CUSTOMER], true)) {
            $query->where('role', $request->role);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('firstname', 'like', "%{$search}%")
                    ->orWhere('lastname', 'like', "%{$search}%")
                    ->orWhere('middlename', 'like', "%{$search}%")
                    ->orWhere('username', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%");
            });
        }

        $users = $query->orderBy('role')->orderBy('firstname')->get();

        $users->each(function ($user) {
            $user->setAttribute('branch_name', optional($user->current_branch)->name);
            $user->setAttribute('login_type', $user->role === User::ROLE_RIDER ? 'rider' : $user->role);
        });

        return response()->json($users);
    }
}