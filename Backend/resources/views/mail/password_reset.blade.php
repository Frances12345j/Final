<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Password Reset OTP</title>
</head>
<body style="margin:0; padding:0; background:#FFF8ED; font-family:Arial, Helvetica, sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FFF8ED; padding:24px 0;">
        <tr>
            <td align="center">
                <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px; width:100%; background:#ffffff; border-radius:20px; overflow:hidden; box-shadow:0 12px 40px rgba(69,26,3,0.12);">
                    <!-- Brand header -->
                    <tr>
                        <td align="center" style="background:#171717; padding:34px 24px;">
                            <div style="display:inline-block; width:72px; height:72px; border-radius:18px; background:#F97316; box-shadow:0 6px 20px rgba(249,115,22,0.45); font-size:30px; line-height:72px; color:#ffffff; font-weight:800;">
                                🔥
                            </div>
                            <div style="font-size:24px; font-weight:800; color:#ffffff; margin-top:12px; letter-spacing:1px;">
                                NewMoon
                            </div>
                            <div style="font-size:11px; color:#F59E0B; letter-spacing:4px; text-transform:uppercase; margin-top:4px;">
                                Lechon Manok &amp; Liempo House
                            </div>
                        </td>
                    </tr>
                    <!-- Body -->
                    <tr>
                        <td align="center" style="padding:36px 40px;">
                            <div style="font-size:14px; color:#78716C; margin-bottom:6px;">Hello{{ $name ? ', ' . $name : '' }},</div>
                            <div style="font-size:18px; font-weight:700; color:#171717; margin:6px 0 14px;">
                                Your Password Reset OTP
                            </div>
                            <div style="font-size:14px; line-height:22px; color:#57534E;">
                                Use the code below to reset your password. This code expires in
                                <strong style="color:#EA580C;">10 minutes</strong>.
                            </div>

                            <div align="center" style="background:#FFF1E6; border:1px dashed #F97316; border-radius:16px; padding:24px; margin:24px 0; letter-spacing:14px; font-size:36px; font-weight:800; color:#EA580C;">
                                {{ $otp }}
                            </div>

                            <div style="font-size:12px; line-height:20px; color:#A8A29E;">
                                If you did not request a password reset, you can safely ignore this email.
                            </div>
                        </td>
                    </tr>
                    <!-- Footer -->
                    <tr>
                        <td align="center" style="background:#171717; padding:20px;">
                            <div style="font-size:11px; color:#A8A29E; letter-spacing:2px; text-transform:uppercase;">
                                NewMoon Lechon Manok &amp; Liempo • Fresh from the Grill 🔥
                            </div>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>