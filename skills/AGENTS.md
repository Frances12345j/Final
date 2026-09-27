## Goal
- Build complete order management flow (Customer → Staff → Rider) with real-time status tracking, map navigation, direction routes, and rider live-tracking.

## Constraints & Preferences
- Mobile app: Expo Router (file-based routing), React Native, TypeScript
- Backend: Laravel 11 (PHP), Sanctum auth, SQLite/MySQL
- Maps: Leaflet via WebView (react-native-webview), react-native-maps installed
- GPS: expo-location installed
- Icons: @expo/vector-icons
- API base URL: `http://192.168.254.101:8000/api` (PC Wi-Fi IP is `.101`; server must bind `--host=0.0.0.0` so IP/DHCP changes don't strand it)
- Staff manages orders: pending → confirmed → preparing → ready
- Rider manages orders: ready → picked_up → out_for_delivery → delivered (with photo proof)
- Customer sees timeline: pending → confirmed → preparing → ready → picked_up → out_for_delivery → delivered
- Real-time polling: OrderDetail polls every 10s, Staff Orders polls every 15s

## Progress
### Done
- Added Staff Orders tab (`Staff/Orders.tsx` + `Staff/_layout.tsx`)
- Added `staffIndex()` and `staffUpdateStatus()` to `OrderController.php`
- Added `GET /staff/orders` and `POST /staff/orders/{id}/status` routes (moved BEFORE `apiResource('staff', ...)` to fix route conflict)
- Fixed Carbon `toISOString()` → `toIso8601String()` bug causing 500 error
- Added `riderIndex()` and `riderUpdateStatus()` to `OrderController.php`
- Added `GET /rider/orders` and `POST /rider/orders/{id}/status` routes
- Created migration `2026_07_04_200002_add_delivery_proof_to_orders_table.php` (delivery_notes, customer_confirmed, delivery_photo, delivered_at)
- Created migration `2026_07_04_200003_add_delivery_coordinates_to_orders_table.php` (delivery_latitude, delivery_longitude)
- Created migration `2026_07_03_200001_add_rider_tracking_to_orders_table.php` (rider_latitude, rider_longitude, rider_location_updated_at)
- Updated Order model `$fillable` with all new columns
- Updated Checkout.tsx to capture GPS location (expo-location) and send `delivery_latitude`/`delivery_longitude` with order
- Updated `OrderController@store` to accept and save delivery coordinates
- Added coordinates (customer + branch) to staffIndex and riderIndex response transforms
- Changed navigate buttons in `Rider/Orders.tsx` from `openNavigation()` (Google Maps) to `router.push('/Rider/Maps')`
- Changed action modal "Navigate"/"To Branch" buttons to single "View on Map" button → Maps screen
- Fixed Maps.tsx: added `setOrders` setter, added `loadOrders()` calling `GET /rider/orders`, replaced hardcoded location sending with loaded orders
- Updated Maps.tsx DeliveryOrder interface, STATUS_MAP, STATUS_COLORS, STATUS_ICONS to cover all rider statuses
- Updated Maps.tsx `toPickup`/`toDeliver` filters to include rider statuses
- Replaced letter-based markers (R/P/O) with SVG teardrop pin + person silhouette in Maps.tsx
- Added `picked_up` step to Customer OrderDetail STATUS_FLOW (step 4), shifted later steps
- Fixed hardcoded connecting line `< 5` → `< 6` in OrderDetail.tsx
- Added pull-to-refresh (RefreshControl) to OrderDetail.tsx
- Redesigned mobile `Login.tsx` into premium food-brand layout: dark `#171717` brand cover (rounded-b-[40px]) with compact rounded-2xl logo + orange glow, "NewMoon" / "LECHON MANOK & LIEMPO HOUSE" text, orange "🔥 FRESH FROM THE GRILL" badge, subtle grill-line accent; form lives in a white/cream bottom-sheet (`-mt-10`, `rounded-t-[32px]`) with left-aligned "Welcome back 👋", 56px inputs (orange focus `#F97316`, error `#DC2626`), orange-to-amber gradient Sign In button, right-aligned Forgot Password, orange Sign Up, cream `#FFF8ED` background with subtle orange decorative circles; Account Not Found modal restyled to cream card / charcoal title / orange Create Account gradient / outlined Cancel. Preserved all auth logic, validation, animation (`fadeAnim`/`slideAnim`), navigation, and loading states.
- Redesigned mobile `Registration.tsx` to match the new Login visual language: same dark `#171717` brand cover with back button (white arrow on translucent pill), compact rounded-2xl logo + orange glow, NewMoon / "LECHON MANOK & LIEMPO HOUSE" / "🔥 FRESH FROM THE GRILL" badge; registration form now a scrollable cream bottom-sheet (`-mt-8`, `rounded-t-[32px]`) with left-aligned "Create your account" + orange accent line, section headers (`Account Information`, `Account Security` — orange icon container `#FFF1E6` + divider), 56px inputs on `#FFFBF7` (orange focus `#F97316`, error `#DC2626`), subtle "Optional" labels, password requirements helper panel, orange-highlighted Terms agreement panel, orange-to-amber Create Account gradient button (h-14, rounded-2xl), orange Sign In link, `TRADITIONAL FLAVORS • AUTHENTIC TASTE` footer. Preserved all validation, availability checks, terms state, navigation, animation, and loading logic.
- Added `updateLocation()` and `trackRider()` methods to `OrderController.php`
- Added `POST /rider/orders/{id}/location` and `GET /customer/orders/{id}/track` routes
- Rider's Maps.tsx: location sending filter changed from `status === 'Ready'` to `status === 'Picked Up' || status === 'Out for Delivery'`
- Maps.tsx: added 5s polling for `loadOrders()` and `useFocusEffect` to refresh on tab focus
- Maps.tsx: location sending interval bug fixed — was re-creating interval every 5s (due to `[riderLocation, orders]` deps) so it **never fired**. Changed to empty deps with refs storing latest riderLocation/orders.
- Maps.tsx: added fallback one-time GPS fetch via `getCurrentPositionAsync` if watcher hasn't returned position
- Maps.tsx: `activeOrderData` filter changed from React JS level (filters orders passed to `GENERATE_MAP_HTML` to only `Picked Up`/`Out for Delivery`)
- Customer `OrderDetail.tsx`: "Track Rider" button now shows for both `picked_up` and `out_for_delivery` statuses
- Customer `OrderDetail.tsx`: fixed invalid icon `cooking-outline` → `flame-outline`
- Customer `Profile.tsx`: created with editable fields (firstname, lastname, email, phone, address), save via `PUT /me`, sign out with confirmation, light theme matching Customer app
- Customer `RiderTracking.tsx`: destination marker now uses customer's `delivery_latitude`/`delivery_longitude` instead of branch location
- RiderTracking.tsx: map re-centers on rider with each poll via `animateToRegion`
- RiderTracking.tsx: fixed "Text strings must be rendered within a <Text> component" by changing all `&&` patterns to ternaries and fixing `toLat`/`toLng` to return `null` instead of `0` for null/NaN inputs
- RiderTracking.tsx: map always renders (with "Waiting" overlay instead of hiding map), `onMapReady` guards `animateToRegion`
- Customer `_layout.tsx`: added collapsible `AnimatedTabBar` component (slide down + fade, chevron toggle, floating restore button)
- Audit of "POS shows 0 / web shows 24" stock mismatch: root cause was `product_stocks.received` flag never set to `true` (web ProductList top-level stock is `received`-gated but per-branch reads raw quantity), plus POS stale AsyncStorage cache + null-branch fallback
- `ProductController@toggleReceived`: now sets `$stock->received = true` when stock is received
- Added migration `2026_09_08_000001_backfill_product_stocks_received.php` (sets `received=1` for existing rows with `quantity>0`); ran on live DB
- `PointOfSales.tsx`: added `refetchOnReconnect`/`refetchOnWindowFocus`/`refetchInterval: 60000` to productsQuery so stale 0 snapshots self-heal
- Back-to-Sales Inventory Save: `BackToSaleController@approve` now saves unsold products directly into branch inventory (`product_stocks.quantity`), creates a fresh FIFO `StockBatch` (`source_type = 'back_to_sale'`) for next-day POS sales, creates a completed `ProductStockDelivery` record for inventory history and stock reports, sends real-time `stock_received` notification, and `BackToSale.jsx` invalidates `products` cache so `/inventory` (Product List) immediately reflects the updated stock levels. Mobile `BackToSale.tsx` also invalidates `products` query on submission.
- `PointOfSales.tsx`: `quantity = Number(branchStock?.quantity ?? 0)` (was `|| 0`, would keep stale string) in both productsQuery and loadOngoingStocks
- `PointOfSales.tsx`: added `branchResolved` state + amber warning banner when staff branch can't be resolved (stock may show 0)
- Admin notifications now identify the branch: `ProductController@toggleReceived` creates a `stock_received` notification ("X received by {Branch} ({qty} units)", renamed message without branch in `markNotReceived`); web `Menu.jsx` notification panel renders a green "Received" tag, a `branch_name` line with pin icon, and branch name in the message data
- `CashAdvanceController@store` now creates a `cash_advance_request` notification when staff files a pending cash advance ("{Staff} requested a cash advance (₱{amount}) — {Branch}", data includes user_name/branch_name/amount); web `Menu.jsx` renders an orange "Cash Advance" tag
- Renamed `SalaryAdvance` → `CashAdvance` across the project (model, controller, mobile screen file + tab name); table stays `cash_advances`, API routes unchanged (`/cash-advances`), composer autoload regenerated
- `SupplyRequestController@store` now creates a `stock_request` notification when staff files a pending stock request ("{Staff} requested {qty} stock of {Product} for {Branch}", data includes user_name/product_name/branch_name/quantity); web `Menu.jsx` renders a teal "Stock Request" tag
- Web `Admin/Login.jsx`: left brand panel reduced to logo only (logo image centered, cream inner card, removed brand text/tagline/grill badge/bottom info); Sign In button fixed for antd v6 (`iconPosition` → `iconPlacement`); unused icon imports removed. Auth logic, layout, glows preserved.
- Redesigned web `Admin/ProductList.jsx` from blue/red/navy to NewMoon orange/amber/charcoal/cream theme: roasted charcoal gradient header (`#171717 → #3B2418 → #451A03`) with orange flame accent line + rounded stat chips (orange icons, `#FDE68A` values), warm cream page bg (`#FFF8ED → #FFFDF9 → #FFF1E6`), orange→amber gradient primary buttons with glow shadow + hover brightness, outline buttons `border-[#EA580C] text-[#EA580C] hover:bg-[#FFF1E6]`, rounded-2xl product images with cream border, orange price text `#EA580C`, gradient stock progress bar (orange for low stock / green gradient normal), pill-shaped Action buttons (gradient Restock, orange-outline Stock Out, amber Adjust, neutral Edit, danger Delete, gradient Enable/Disable), themed empty state (gradient orange icon tile), modal inputs `border-[#F5EDE0] focus:border-[#F97316]` + info panels `bg-[#FFF1E6]`. All logic (API endpoints, branch filter, stock calcs, cache, modals) preserved. ESLint clean (5 pre-existing unused-var warnings), `npx vite build` passes.
- Unified remaining web `Admin/*.jsx` components to the same NewMoon theme as Dashboard/ProductList: `CashAdvance.jsx`, `SupplyRequest.jsx`, `RequestAdmin.jsx`, `BackToSale.jsx`, `AttendanceSheet.jsx`, `BranchAssignments.jsx`, `PullOutAdmin.jsx`, `BranchMap.jsx`, `StaffPerformance.jsx`, `SalesRecord.jsx`, `EmployeeTracker.jsx`, `BranchDetails.jsx` — all converted from FoodMeal red/navy (`#E53935`/`#1A237E`/`#E3F2FD`/`#FFEBEE`), generic blue, and plain-gray legacy styles to the charcoal hero header + orange flame accent + cream gradient page + `#F5EDE0` white cards + `#FFF1E6` info panels + orange→amber gradient buttons pattern; KPI chips moved into dark heroes; stat-card values `#EA580C`; status tags softened (`#D97706`/`#16A34A`/`#DC2626`); modal titles use orange gradient icon tiles; empty states use gradient orange icon tiles; BranchMap Leaflet + EmployeeTracker tracking logic untouched. All business logic preserved. `npx eslint src/Admin` → 0 errors (33 pre-existing warnings), `npx vite build` passes.

- Redesigned mobile Rider `Rider/(tabs)/Dashboard.tsx` (`RiderDashboard`) into premium NewMoon food-delivery look: charcoal→brown gradient header (`#171717 → #451A03`) with flame logo tile, NewMoon / "Lechon Manok & Liempo" brand, "Rider Dashboard", "Welcome back, {name} 👋", Delivery Rider badge, orange avatar initial `#EA580C` + translucent logout; pulse-animated GPS pill (green/red) + orange `X ACTIVE` bike pill; hero "Today&apos;s Delivery Run" gradient card (`#EA580C → #C2410C`) with delivered count, Done/Active chips, `runProgress` bar + motivational line; Delivered/Active stat cards (green + orange icon tiles); bordered `#FFFBF5` Today&apos;s Earnings card with orange wallet tile; Active Orders section (status badges via NewMoon palette, customer/address icons, total, View Order → `/Rider/Orders`); Recent Deliveries with green check rows + branded empty state (`No deliveries yet`); `NewMoon Lechon Manok & Liempo` footer (`Rider Portal • Fresh from the Grill 🔥`); branded cream loading screen with flame icon. Preserved all API calls (`/rider/orders?per_page=50`), `useAuth`/`signOut`, `expo-location` `watchPositionAsync`, 30s auto-refresh, pull-to-refresh, logout confirmation, currency `₱`, routes, TS interfaces, and stats/active/earnings calculations. `npx tsc --noEmit` no errors in file; eslint only pre-existing ref/setState warnings.
- Admin Dashboard: added **Online Orders** tracking + **Online Sales** charts via new `OrderController@adminOverview` (`GET /admin/orders/overview?period=today|week|month`) — returns status counts (pending→cancelled incl. zeros), summary (total/active/today/delivered orders + today/total/delivered revenue), 8 latest app orders, and a bucketed chart series (24h / 7d / 30d with `orders` + `revenue`). `Dashboard.jsx` renders a live panel that polls every 30s (with a `Reload` button) showing status pills, summary chips, recent-order list (→ `/delivery`), and a recharts `ComposedChart` (Bar = orders, Area = revenue, Today/Week/Month toggle). Matches the existing plum/mint dashboard theme; `npm run build` passes.
- Fixed web admin `app-*.js` runtime crash `Uncaught ReferenceError: Cannot access 'xe' before initialization` — `Dashboard.jsx` `OVERVIEW_STATUS` array referenced `ACCENT`/`RED` consts before declaration (TDZ). Moved the palette block above `OVERVIEW_STATUS`.
- Added Dashboard KPI card for **Online Orders** (total via `overviewSummary.total_orders`, links to `/delivery`, violet icon tile); KPI grid changed to `xl:grid-cols-5`.
- Added **OTP email password reset** for customer/rider/staff (mobile): new `password_resets` table migration (`2026_09_20_000002`), `PasswordReset` model, `App\Mail\PasswordResetMail` + `resources/views/mail/password_reset.blade.php` branded OTP email, and `AuthController` methods `forgotPassword` (sends 6-digit OTP, 10-min expiry), `verifyOtp` (returns 64-char `reset_token`, 15-min expiry), `resetPassword` (updates password w/ `Password::min(8)` confirmed). Public routes `POST /api/forgot-password`, `POST /api/forgot-password/verify`, `POST /api/forgot-password/reset`. `.env` switched to Gmail SMTP (`smtp.gmail.com:587`, `MAIL_USERNAME`/`MAIL_PASSWORD`/`MAIL_FROM_ADDRESS` are placeholders needing a real Gmail + app password). Mobile: new `src/app/ForgotPassword.tsx` (3-step brand-themed reset flow: email → OTP + 60s resend countdown → new password w/ confirm) and wired Login.tsx "Forgot Password?" link to it. `npx tsc --noEmit` clean for new files (only pre-existing `example/` + ref-warning lint noise).

### In Progress
- (none)

### Done
- Root-caused repeated "Branch not resolved — stock may show 0" (POS inventory all 0): the Laravel dev server (`php -S 192.168.254.101:8000`) had HUNG — port 8000 stayed bound (pid `15664`) but every request timed out, so the phone's `/me`/`/staff-assignments` resolution calls all timed out, branch stayed null, and stock rendered 0 from cache. DB was fine (user id 2 has active assignment to branch 1). Fix: killed the stale pid and restarted `php artisan serve --host=0.0.0.0 --port=8000` (background/`Start-Process`, hidden window) → API now responds (verified 422 on empty `POST /api/login`). `authContext.tsx:53` already persists `branch_id` at login, so once online the app self-heals from storage on later launches.
- App-side hardening already in place: `PointOfSales.tsx` re-resolves branch (up to 5 retries × 6s) and `productsQuery` refetches on reconnect, focus, and every 60s; banner auto-clears the moment `branchResolved` flips true.
- Migrated Web Admin components from `Newmoon-Web` into `Backend/resources/js/app/admin/`: all 19 admin components, Layout, MENU, Reports, components, config, utils, assets, hooks, and ProtectedRoute transferred to Backend. Created `AdminApp.jsx` with full SPA router and `app.jsx` entry point. Configured Laravel Blade template `resources/views/app.blade.php`, SPA catch-all route in `routes/web.php` (ignoring `/api`), updated `Backend/package.json` with React/AntD/Tailwind/etc., and verified full production build with `npm run build` (0 errors). Transferred public SVG assets to `Backend/public/` and completely removed `Newmoon-Web`.
- Redesigned `MENU/Menu.jsx` and `MENU/Layout.jsx` into a premium NewMoon Roasted Chicken & Liempo management system UI: deep roasted charcoal sidebar (`#130D09 → #1A110B → #140D08`) with ember glow at top, mascot logo from `logooos.jpg` in glowing ring with flame indicator `🔥`, "NEWMOON - LECHON MANOK & LIEMPO" typography with "🔥 CHARCOAL ROASTED SYSTEM" badge, online rotisserie status pill, culinary-categorized navigation (Roasted Specialties, Grill Inventory, Store Operations, Kitchen Crew & Staff, Outlets & Branches, Delivery Fleet, Reports), warm orange/amber gradient active item pills with glowing drop-shadow, roasted chicken House Specialty banner featuring `chicken.jpg` ("Charcoal Lechon Manok • Fresh from the Rotisserie"), dark-mode ember alerts dropdown with category badges, themed logout modal, and updated `Layout.jsx` background to warm cream `#FFF8ED` to eliminate gray container flash. Production build verified with `npm run build` (0 errors).
- Re-themed ALL Web Admin pages in `Backend/resources/js/app/admin/` to the dark plum + mint UI (reference = `ProductList.jsx`): every component except Dashboard/ProductList had its cream/orange (`#FFF8ED`/`#EA580C`/`#F97316`/`#F59E0B`) theme replaced with dark plum (`PANEL_BG #2A2438`, `PANEL_BG_2 #332C45`, page bg `#1F1A2E`) + mint accents (`#22D3A8`/`#16B48C`) — including `AttendanceSheet`, `BackToSale`, `BranchAssignments`, `BranchDetails`, `BranchMap`, `CashAdvance`, `Customers`, `Delivery`, `EmployeeTracker`, `Login`, `PullOutAdmin`, `RequestAdmin`, `SalesRecord`, `Staff`, `StaffPerformance`, `SupplyRequest`, `UserProfiles`. Each page now defines the same palette/style tokens (`GRADIENT_BTN`/`SECONDARY_BTN`/`GHOST_BTN`/`FIELD_LABEL`) as ProductList and embeds its `.nm-dark` + global antd-modal dark `<style>` blocks. **UI-only change**: business logic, API calls, state, handlers, props, Leaflet map/tracking logic all preserved. `vite build` passes (single 3.3 MB chunk, sizes warning pre-existing). The only intentional non-plum color left is per-status semantic orange `#F97316` in `Dashboard.jsx` (Out for Delivery status). Backend has NO eslint config (previous `Newmoon-Web` config was deleted) — verify with `npm run build` instead.

## Key Decisions
- Staff order routes placed BEFORE `apiResource('staff', ...)` to prevent `{staff}` route catching "/orders" as a resource ID
- Customer checkout silently captures GPS (silent catch on permission denial) — no map picker UI
- Maps screen shows all rider orders, not single-order directions; Leaflet map via WebView
- Person pin uses inline SVG teardrop/pin shape + person silhouette instead of emoji or library
- Location sending interval uses refs with empty deps `[]` to prevent re-creation on every GPS update (was causing interval to never fire)
- `toLat`/`toLng` return `null` instead of `0` for null/NaN input to avoid falsy `0` rendering via `&&` patterns
- Rider location sent for `Picked Up` and `Out for Delivery` only (not `Ready` or `Delivered`)
- Customer tab bar collapse uses same approach as Rider: `AnimatedTabBar` component with `Animated.timing`, `useNativeDriver: true`, chevron toggle + floating restore button

## Next Steps
- Run `php artisan migrate` to add new rider tracking columns to orders table
- Run `php artisan serve` to restart backend for new routes

## Critical Context
- Old orders (placed before delivery migration) have null `delivery_latitude`/`delivery_longitude` → customer pin won't show on map, fallback to branch pin
- Rider MUST have Maps tab mounted at least once for GPS watcher to start; if GPS permission denied, fallback `getCurrentPositionAsync` also won't work
- Location API `POST /rider/orders/{id}/location` silently catches errors (was `catch {}`); now logs to console for debugging
- `openNavigation()` function still exists in `Rider/Orders.tsx` but is no longer called from the new navigate buttons
- Customer MUST have GPS permission granted at checkout for rider directions to work; silently skips if denied
- Branch lat/lng already exist in `branches` table (migration `2026_06_25_000002`)

## Relevant Files
- `Backend/app/Http/Controllers/Api/OrderController.php`: All order endpoints (customer, staff, rider) + `updateLocation`/`trackRider`/`assignRider`
- `Backend/routes/api.php`: Route definitions (order-sensitive — staff routes before apiResource)
- `Backend/app/Models/Order.php`: Order model with fillable fields (rider_latitude, rider_longitude, rider_location_updated_at, delivery_proof columns)
- `Backend/database/migrations/2026_07_04_200002_add_delivery_proof_to_orders_table.php`: Delivery proof columns
- `Backend/database/migrations/2026_07_04_200003_add_delivery_coordinates_to_orders_table.php`: Delivery lat/lng columns
- `Backend/database/migrations/2026_07_03_200001_add_rider_tracking_to_orders_table.php`: Rider tracking columns
- `Newmoon-Mobile/src/app/Customer/Checkout.tsx`: GPS capture on order placement
- `Newmoon-Mobile/src/app/Customer/OrderDetail.tsx`: Real-time status timeline with pull-to-refresh, Track Rider button
- `Newmoon-Mobile/src/app/Customer/RiderTracking.tsx`: Live rider tracking map with real-time polling (MapView, Marker, Polyline)
- `Newmoon-Mobile/src/app/Customer/Profile.tsx`: Editable profile (PUT /me) with sign out
- `Newmoon-Mobile/src/app/Customer/_layout.tsx`: Customer tab bar with collapsible AnimatedTabBar
- `Newmoon-Mobile/src/app/Staff/Orders.tsx`: Staff order management with status transitions
- `Newmoon-Mobile/src/app/Staff/_layout.tsx`: Staff tab bar with Orders tab
- `Newmoon-Mobile/src/app/Rider/Orders.tsx`: Rider order cards with action buttons, map navigation
- `Newmoon-Mobile/src/app/Rider/Maps.tsx`: Leaflet map with branches, order pins, rider routes, GPS location sending (refs-based interval)
- `Newmoon-Mobile/src/app/Rider/ProofOfDelivery.tsx`: Camera + form for delivery photo proof
- `Newmoon-Mobile/src/app/Rider/_layout.tsx`: Rider tab bar with collapsible AnimatedTabBar
- `Newmoon-Mobile/lib/api.ts`: Axios config with base URL and token interceptor
