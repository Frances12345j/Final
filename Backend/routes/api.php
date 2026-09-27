<?php


use App\Models\StockRequest;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\PulloutController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\LoginController;
use App\Http\Controllers\Api\BranchController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\StaffController;
use App\Http\Controllers\Api\AttendanceController;
use App\Http\Controllers\Api\SaleController;
use App\Http\Controllers\Api\StaffAssignmentController;
use App\Http\Controllers\Api\FaceEnrollmentController;
use App\Http\Controllers\Api\CashAdvanceController;
use App\Http\Controllers\Api\StockRequestController;
use App\Http\Controllers\Api\SupplyRequestController;
use App\Http\Controllers\Api\ReportController;
use App\Http\Controllers\Api\RegisterController;
use App\Http\Controllers\Api\OrderController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\CustomerController;
use App\Http\Controllers\Api\StaffPerformanceController;
use App\Http\Controllers\Api\BackToSaleController;
use App\Http\Controllers\Api\AddressController;
use App\Http\Controllers\Api\SalesTargetController;
use App\Http\Controllers\Api\PaymentController;
use App\Http\Controllers\Api\ChatController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\ExpenseController;

// PUBLIC ROUTES
Route::post('/login', [AuthController::class, 'login']);
Route::post('/admin/login', [LoginController::class, 'login']);
Route::post('/register', [RegisterController::class, 'register']);
Route::post('/check-username', [RegisterController::class, 'checkUsername']);
Route::post('/check-email', [RegisterController::class, 'checkEmail']);

// Forgot password (customer / rider / staff) — OTP via email
Route::post('/forgot-password', [AuthController::class, 'forgotPassword']);
Route::post('/forgot-password/verify', [AuthController::class, 'verifyOtp']);
Route::post('/forgot-password/reset', [AuthController::class, 'resetPassword']);

// PROTECTED ROUTES
Route::middleware('auth:sanctum')->group(function () {
    // Auth
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);
    Route::put('/me', [AuthController::class, 'updateProfile']);
    Route::post('/me/avatar', [AuthController::class, 'updateAvatar']);

    // Branches
    Route::get('/branches/user', [BranchController::class, 'getUserBranches']);
    Route::apiResource('branches', BranchController::class);
    Route::get('/branches/{id}/sales', [BranchController::class, 'getSales']);
    Route::get('/branches/{id}/attendance', [BranchController::class, 'getAttendance']);
    Route::get('/branches/{id}/dashboard', [BranchController::class, 'getDashboardData']);

    // Products  — named routes MUST come before apiResource to avoid {id} catching them
    Route::get('/products/low-stock/all', [ProductController::class, 'getLowStock']);
    Route::get('/products/restock/pending-count', [ProductController::class, 'pendingCount']);
    Route::apiResource('products', ProductController::class);
    Route::post('/products/{id}/restock', [ProductController::class, 'restock']);
    Route::post('/products/{id}/pull-out', [ProductController::class, 'pullOut']);
    Route::delete('/manual-stock-outs/{id}', [ProductController::class, 'reverseStockOut']);
    Route::post('/products/{id}/toggle-received', [ProductController::class, 'toggleReceived']);
    Route::get('/stock-batches', [ProductController::class, 'stockBatches']);

    // Staff (must come before apiResource to avoid {staff} catching "orders")
    Route::get('/staff/orders', [OrderController::class, 'staffIndex']);
    Route::post('/staff/orders/{id}/status', [OrderController::class, 'staffUpdateStatus']);
    Route::apiResource('staff', StaffController::class);

    // User profiles (admin view for staff, riders, customers)
    Route::get('/users', [UserController::class, 'index']);

    // Staff Assignments - Add these routes
    Route::get('staff-assignments', [StaffAssignmentController::class, 'index']);
    Route::post('staff-assignments', [StaffAssignmentController::class, 'store']);
    Route::get('staff-assignments/{staff_assignment}', [StaffAssignmentController::class, 'show']);
    Route::put('staff-assignments/{staff_assignment}', [StaffAssignmentController::class, 'update']);
    Route::patch('staff-assignments/{staff_assignment}', [StaffAssignmentController::class, 'update']); // optional, for PATCH support
    Route::delete('staff-assignments/{staff_assignment}', [StaffAssignmentController::class, 'destroy']);
    Route::get('/staff/{userId}/assignment', [StaffAssignmentController::class, 'getUserAssignment']);

    // Cash Advance
    Route::get('/cash-advances', [CashAdvanceController::class, 'index']);
    Route::get('/cash-advances/all', [CashAdvanceController::class, 'all']);
    Route::post('/cash-advances', [CashAdvanceController::class, 'store']);
    Route::get('/cash-advances/statistics', [CashAdvanceController::class, 'statistics']);
    Route::get('/cash-advances/{id}', [CashAdvanceController::class, 'show']);
    Route::post('/cash-advances/{id}/approve', [CashAdvanceController::class, 'approve']);
    Route::post('/cash-advances/{id}/reject', [CashAdvanceController::class, 'reject']);

    // Stock Requests
    Route::get('/stock-requests', [StockRequestController::class, 'myStockRequests']);
    Route::get('/stock-requests/all', [StockRequestController::class, 'allStockRequests']);
    Route::post('/stock-requests', [StockRequestController::class, 'store']);
    Route::get('/stock-requests/user/branches', [StockRequestController::class, 'getUserBranches']);
    Route::get('/stock-requests/statistics', [StockRequestController::class, 'statistics']);
    Route::get('/stock-requests/{id}', [StockRequestController::class, 'show']);
    Route::post('/stock-requests/{id}/approve', [StockRequestController::class, 'approve']);
    Route::post('/stock-requests/{id}/reject', [StockRequestController::class, 'reject']);

    // Supply Requests (operational supplies: charcoal, foil, bulsita, sauce, ...)
    // Separate from Stock Requests above.
    Route::get('/supplies', [SupplyRequestController::class, 'supplies']);
    Route::get('/supply-requests', [SupplyRequestController::class, 'index']);
    Route::post('/supply-requests', [SupplyRequestController::class, 'store']);
    Route::get('/supply-requests/branches', [SupplyRequestController::class, 'branches']);
    Route::get('/supply-requests/statistics', [SupplyRequestController::class, 'statistics']);
    Route::get('/supply-requests/{id}', [SupplyRequestController::class, 'show']);
    Route::put('/supply-requests/{id}', [SupplyRequestController::class, 'update']);
    Route::post('/supply-requests/{id}/approve', [SupplyRequestController::class, 'approve']);
    Route::post('/supply-requests/{id}/reject', [SupplyRequestController::class, 'reject']);

    // Stock Out Requests (staff request → admin approval)
    Route::get('/pull-outs', [PulloutController::class, 'index']);
    Route::get('/pull-outs/getall', [PulloutController::class, 'getall']);
    Route::post('/pull-outs', [PulloutController::class, 'store']);
    Route::get('/pull-outs/statistics', [PulloutController::class, 'statistics']);
    Route::get('/pull-outs/{id}', [PulloutController::class, 'show']);
    Route::post('/pull-outs/{id}/approve', [PulloutController::class, 'approve']);
    Route::post('/pull-outs/{id}/reject', [PulloutController::class, 'reject']);

    // Back-to-Sales
    Route::get('/back-to-sales', [BackToSaleController::class, 'index']);
    Route::get('/back-to-sales/all', [BackToSaleController::class, 'all']);
    Route::post('/back-to-sales', [BackToSaleController::class, 'store']);
    Route::get('/back-to-sales/{id}', [BackToSaleController::class, 'show']);
    Route::post('/back-to-sales/{id}/approve', [BackToSaleController::class, 'approve']);
    Route::post('/back-to-sales/{id}/reject', [BackToSaleController::class, 'reject']);
    Route::post('/back-to-sales/approve-all', [BackToSaleController::class, 'approveAll']);

    // Face enrollment (attendance)
    Route::get('/face/status', [FaceEnrollmentController::class, 'status']);
    Route::post('/face/enroll', [FaceEnrollmentController::class, 'enroll']);
    Route::post('/face/verify', [FaceEnrollmentController::class, 'verify']);
    Route::post('/face/reset', [FaceEnrollmentController::class, 'reset']);

    // Attendance
    Route::get('/attendance', [AttendanceController::class, 'getAttendance']);
    Route::post('/attendance/time-in', [AttendanceController::class, 'timeIn']);
    Route::put('/attendance/{id}/time-out', [AttendanceController::class, 'timeOut']);

    // Sales - Custom routes MUST come before apiResource
    Route::get('/sales/product-incentives', [SaleController::class, 'getProductIncentives']);
    Route::get('/sales/product-incentives/daily', [SaleController::class, 'getDailyProductIncentives']);
    Route::get('/sales/summary/overview', [SaleController::class, 'getSalesSummary']);
    Route::apiResource('sales', SaleController::class);

    // Customer Orders
    Route::get('/customer/orders', [OrderController::class, 'index']);
    Route::post('/customer/orders', [OrderController::class, 'store']);
    Route::post('/customer/delivery-fee', [OrderController::class, 'quoteDeliveryFee']);
    Route::get('/customer/orders/{id}', [OrderController::class, 'show']);
    Route::post('/customer/orders/{id}/cancel', [OrderController::class, 'cancel']);
    Route::get('/customer/orders/{id}/track', [OrderController::class, 'trackRider']);
    Route::get('/customer/order-statuses', [OrderController::class, 'statuses']);

    // Rider Orders
    Route::get('/rider/orders', [OrderController::class, 'riderIndex']);
    Route::post('/rider/orders/{id}/status', [OrderController::class, 'riderUpdateStatus']);

    // Rider Tracking
    Route::post('/rider/orders/{id}/location', [OrderController::class, 'updateLocation']);
    Route::post('/rider/orders/{id}/assign', [OrderController::class, 'assignRider']);

    // Admin Dashboard (online orders + online sales overview)
    Route::get('/admin/orders/overview', [OrderController::class, 'adminOverview']);

    // Chat (order-based, works for both customer and rider)
    Route::get('/chat/{orderId}/messages', [ChatController::class, 'index']);
    Route::post('/chat/{orderId}/messages', [ChatController::class, 'store']);
    Route::get('/chat/{orderId}/unread', [ChatController::class, 'unread']);
    Route::post('/chat/{orderId}/read', [ChatController::class, 'markRead']);

    // Notifications
    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::get('/notifications/unread-count', [NotificationController::class, 'unreadCount']);
    Route::post('/notifications/{id}/read', [NotificationController::class, 'markAsRead']);
    Route::post('/notifications/read-all', [NotificationController::class, 'markAllAsRead']);

    // Mark product as not received
    Route::post('/products/{id}/mark-not-received', [ProductController::class, 'markNotReceived']);

    // Reports
    Route::get('/reports/sales/summary', [ReportController::class, 'salesSummary']);
    Route::get('/reports/sales/branches', [ReportController::class, 'salesBranchSummary']);
    Route::get('/reports/sales/products', [ReportController::class, 'salesProductSummary']);
    Route::get('/reports/sales/trends', [ReportController::class, 'salesTrends']);


    Route::get('/reports/sales', [ReportController::class, 'sales']);
    Route::get('/reports/inventory', [ReportController::class, 'inventory']);
    Route::get('/reports/inventory-report', [ReportController::class, 'inventoryReport']);
    Route::get('/reports/attendance', [ReportController::class, 'attendance']);
    Route::get('/reports/branches', [ReportController::class, 'branches']);
    Route::get('/reports/PullOut', [ReportController::class, 'PullOut']);
    Route::get('/reports/deliveries', [ReportController::class, 'deliveries']);

    // Expenses (recorded by staff from the POS, surfaced for admin reporting)
    Route::get('/expenses/categories', [ExpenseController::class, 'categories']);
    Route::get('/expenses', [ExpenseController::class, 'index']);
    Route::post('/expenses', [ExpenseController::class, 'store']);
    Route::get('/expenses/{expense}', [ExpenseController::class, 'show']);
    Route::delete('/expenses/{expense}', [ExpenseController::class, 'destroy']);

    // Customers
    Route::get('/customers', [CustomerController::class, 'index']);
    Route::get('/customers/{id}', [CustomerController::class, 'show']);
    Route::post('/customers/{id}/toggle-active', [CustomerController::class, 'toggleActive']);

    // Staff Performance
    Route::get('/staff-performance', [StaffPerformanceController::class, 'index']);

    // Sales Targets
    Route::get('/sales-targets', [SalesTargetController::class, 'index']);
    Route::get('/sales-targets/me', [SalesTargetController::class, 'myTarget']);
    Route::post('/sales-targets', [SalesTargetController::class, 'store']);
    Route::post('/sales-targets/bulk', [SalesTargetController::class, 'bulkStore']);
    Route::put('/sales-targets/{id}', [SalesTargetController::class, 'update']);
    Route::delete('/sales-targets/{id}', [SalesTargetController::class, 'destroy']);

    // Addresses
    Route::get('/addresses', [AddressController::class, 'index']);
    Route::post('/addresses', [AddressController::class, 'store']);
    Route::get('/addresses/{address}', [AddressController::class, 'show']);
    Route::put('/addresses/{address}', [AddressController::class, 'update']);
    Route::delete('/addresses/{address}', [AddressController::class, 'destroy']);
    Route::post('/addresses/{address}/default', [AddressController::class, 'setDefault']);

    // Payment (PayMongo GCash)
    Route::post('/payment/gcash/create-source', [PaymentController::class, 'createGcashSource']);
    Route::get('/payment/gcash/check-status', [PaymentController::class, 'checkSourceStatus']);
    Route::get('/payment/gcash/success', [PaymentController::class, 'gcashSuccess']);
    Route::get('/payment/gcash/failed', [PaymentController::class, 'gcashFailed']);
});

// Webhook (no auth - PayMongo calls this)
Route::post('/payment/webhook', [PaymentController::class, 'webhook']);
