# API Endpoints Documentation
## mel.iq Dashboard - Backend API Requirements

### Base URL
```
/api/v1
```

---

## 🔐 Authentication Endpoints

### 1. تسجيل الدخول
```
POST /api/auth/login
```
**Request Body:**
```json
{
  "email": "string",
  "password": "string"
}
```
**Response:**
```json
{
  "success": true,
  "token": "jwt_token_here",
  "user": {
    "id": "string",
    "username": "string",
    "name": "string",
    "role": "owner" | "employee" | "support",
    "email": "string"
  }
}
```

### 2. تسجيل الخروج
```
POST /api/auth/logout
```
**Headers:** `Authorization: Bearer {token}`
**Response:**
```json
{
  "success": true,
  "message": "تم تسجيل الخروج بنجاح"
}
```

### 3. التحقق من التوكن
```
GET /api/auth/verify
```
**Headers:** `Authorization: Bearer {token}`

---

## 📊 Dashboard Endpoints

### 4. إحصائيات الداشبورد
```
GET /api/dashboard/stats
```
**Headers:** `Authorization: Bearer {token}`
**Response:**
```json
{
  "totalStores": 24,
  "activeEmployees": 15,
  "totalRevenue": 125000,
  "openTickets": 8,
  "activeSubscriptions": 18,
  "todayOrders": 142
}
```

### 5. النشاطات الأخيرة
```
GET /api/dashboard/recent-activities?limit=10
```
**Headers:** `Authorization: Bearer {token}`
**Response:**
```json
{
  "activities": [
    {
      "id": "string",
      "action": "string",
      "time": "string",
      "type": "store" | "payment" | "employee" | "support",
      "userId": "string",
      "userName": "string"
    }
  ]
}
```

---

## 🏪 Stores Endpoints

### 6. قائمة المتاجر
```
GET /api/stores?page=1&limit=20&status=active&search=
```
**Headers:** `Authorization: Bearer {token}`
**Query Parameters:**
- `page`: رقم الصفحة (default: 1)
- `limit`: عدد النتائج (default: 20)
- `status`: active | inactive | expired
- `search`: بحث في اسم المتجر أو المالك
**Response:**
```json
{
  "stores": [
    {
      "id": "string",
      "name": "string",
      "owner": "string",
      "ownerEmail": "string",
      "subscriptionId": "string",
      "subscriptionPlan": "Premium" | "Pro" | "Basic",
      "status": "active" | "inactive" | "expired",
      "revenue": 45000,
      "orders": 234,
      "expiryDate": "2024-12-31",
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-11-15T00:00:00Z"
    }
  ],
  "total": 24,
  "page": 1,
  "limit": 20
}
```

### 7. إحصائيات المتاجر
```
GET /api/stores/stats
```
**Response:**
```json
{
  "totalStores": 24,
  "activeStores": 18,
  "expiredSubscriptions": 6,
  "totalRevenue": 120500
}
```

### 8. تفاصيل متجر
```
GET /api/stores/:id
```

### 9. إنشاء متجر
```
POST /api/stores
```
**Request Body:**
```json
{
  "name": "string",
  "owner": "string",
  "ownerEmail": "string",
  "subscriptionPlanId": "string",
  "status": "active"
}
```

### 10. تحديث متجر
```
PUT /api/stores/:id
```

### 11. حذف متجر
```
DELETE /api/stores/:id
```

---

## 👥 Employees Endpoints

### 12. قائمة الموظفين
```
GET /api/employees?page=1&limit=20&role=&status=&search=
```
**Headers:** `Authorization: Bearer {token}` (Owner only)
**Query Parameters:**
- `role`: owner | employee | support
- `status`: active | inactive
- `department`: المبيعات | التسويق | الدعم الفني
**Response:**
```json
{
  "employees": [
    {
      "id": "string",
      "name": "string",
      "email": "string",
      "role": "employee" | "support",
      "department": "string",
      "status": "active" | "inactive",
      "joinDate": "2024-01-15",
      "lastActive": "2024-11-15T10:00:00Z",
      "avatar": "url"
    }
  ],
  "total": 15,
  "page": 1,
  "limit": 20
}
```

### 13. إحصائيات الموظفين
```
GET /api/employees/stats
```
**Response:**
```json
{
  "totalEmployees": 15,
  "activeEmployees": 12,
  "salesEmployees": 5,
  "supportEmployees": 4
}
```

### 14. تفاصيل موظف
```
GET /api/employees/:id
```

### 15. إضافة موظف
```
POST /api/employees
```
**Request Body:**
```json
{
  "name": "string",
  "email": "string",
  "password": "string",
  "role": "employee" | "support",
  "department": "string"
}
```

### 16. تحديث موظف
```
PUT /api/employees/:id
```

### 17. حذف موظف
```
DELETE /api/employees/:id
```

---

## 💰 Accounting Endpoints

### 18. قائمة المعاملات المالية
```
GET /api/accounting/transactions?page=1&limit=20&type=&status=&dateFrom=&dateTo=&storeId=
```
**Headers:** `Authorization: Bearer {token}`
**Query Parameters:**
- `type`: payment | subscription | refund
- `status`: completed | pending | cancelled
- `dateFrom`: تاريخ البداية (YYYY-MM-DD)
- `dateTo`: تاريخ النهاية (YYYY-MM-DD)
- `storeId`: فلترة حسب المتجر
**Response:**
```json
{
  "transactions": [
    {
      "id": "string",
      "type": "payment" | "subscription",
      "storeId": "string",
      "storeName": "string",
      "amount": 5000,
      "currency": "IQD",
      "date": "2024-11-15",
      "status": "completed" | "pending" | "cancelled",
      "paymentMethod": "string",
      "reference": "string",
      "createdAt": "2024-11-15T00:00:00Z"
    }
  ],
  "total": 100,
  "page": 1,
  "limit": 20
}
```

### 19. إحصائيات المحاسبة
```
GET /api/accounting/stats?month=&year=
```
**Response:**
```json
{
  "totalRevenue": 125000,
  "pendingAmount": 5000,
  "monthlyTransactions": 45,
  "averageTransaction": 2777,
  "revenueByMonth": [
    {"month": "2024-01", "amount": 10000},
    {"month": "2024-02", "amount": 15000}
  ]
}
```

### 20. تفاصيل معاملة
```
GET /api/accounting/transactions/:id
```

### 21. إنشاء معاملة
```
POST /api/accounting/transactions
```

### 22. تحديث حالة المعاملة
```
PUT /api/accounting/transactions/:id/status
```
**Request Body:**
```json
{
  "status": "completed" | "pending" | "cancelled"
}
```

### 23. تصدير التقارير
```
GET /api/accounting/reports/export?format=pdf|excel&dateFrom=&dateTo=
```

---

## 📋 Subscription Plans Endpoints

### 24. قائمة الخطط
```
GET /api/plans
```
**Response:**
```json
{
  "plans": [
    {
      "id": "string",
      "name": "Basic" | "Pro" | "Premium",
      "price": 50000,
      "currency": "IQD",
      "duration": "monthly" | "yearly",
      "features": ["string"],
      "activeStores": 12,
      "maxStores": 1,
      "maxProducts": 100,
      "isActive": true
    }
  ]
}
```

### 25. تفاصيل خطة
```
GET /api/plans/:id
```

### 26. إنشاء خطة
```
POST /api/plans
```
**Request Body:**
```json
{
  "name": "string",
  "price": 50000,
  "duration": "monthly",
  "features": ["string"],
  "maxStores": 1,
  "maxProducts": 100
}
```

### 27. تحديث خطة
```
PUT /api/plans/:id
```

### 28. حذف خطة
```
DELETE /api/plans/:id
```

### 29. قائمة الاشتراكات
```
GET /api/subscriptions?page=1&limit=20&status=&planId=&storeId=
```
**Response:**
```json
{
  "subscriptions": [
    {
      "id": "string",
      "storeId": "string",
      "storeName": "string",
      "planId": "string",
      "planName": "string",
      "startDate": "2024-01-01",
      "endDate": "2024-12-31",
      "status": "active" | "expired" | "cancelled",
      "autoRenew": true,
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ],
  "total": 24,
  "page": 1,
  "limit": 20
}
```

### 30. إنشاء اشتراك
```
POST /api/subscriptions
```

### 31. تحديث اشتراك
```
PUT /api/subscriptions/:id
```

---

## 🎫 Support Tickets Endpoints

### 32. قائمة التذاكر
```
GET /api/support/tickets?page=1&limit=20&status=&priority=&category=&assigneeId=&search=
```
**Headers:** `Authorization: Bearer {token}`
**Query Parameters:**
- `status`: open | in_progress | closed
- `priority`: high | medium | low
- `category`: payment | sales | technical | subscription
- `assigneeId`: فلترة حسب المكلف
**Response:**
```json
{
  "tickets": [
    {
      "id": "TKT-001",
      "title": "string",
      "description": "string",
      "storeId": "string",
      "storeName": "string",
      "priority": "high" | "medium" | "low",
      "status": "open" | "in_progress" | "closed",
      "category": "payment" | "sales" | "technical" | "subscription",
      "assigneeId": "string",
      "assigneeName": "string",
      "createdAt": "2024-11-15T00:00:00Z",
      "updatedAt": "2024-11-15T10:00:00Z",
      "closedAt": null
    }
  ],
  "total": 50,
  "page": 1,
  "limit": 20
}
```

### 33. إحصائيات التذاكر
```
GET /api/support/tickets/stats
```
**Response:**
```json
{
  "total": 50,
  "open": 12,
  "inProgress": 8,
  "closed": 30,
  "highPriority": 5,
  "avgResolutionTime": 1440
}
```

### 34. تفاصيل تذكرة
```
GET /api/support/tickets/:id
```
**Response:**
```json
{
  "ticket": {
    "id": "string",
    "title": "string",
    "description": "string",
    "storeId": "string",
    "storeName": "string",
    "priority": "high",
    "status": "open",
    "category": "payment",
    "assigneeId": "string",
    "assigneeName": "string",
    "messages": [
      {
        "id": "string",
        "userId": "string",
        "userName": "string",
        "message": "string",
        "createdAt": "2024-11-15T00:00:00Z"
      }
    ],
    "createdAt": "2024-11-15T00:00:00Z",
    "updatedAt": "2024-11-15T10:00:00Z"
  }
}
```

### 35. إنشاء تذكرة
```
POST /api/support/tickets
```
**Request Body:**
```json
{
  "title": "string",
  "description": "string",
  "storeId": "string",
  "priority": "high" | "medium" | "low",
  "category": "payment" | "sales" | "technical" | "subscription"
}
```

### 36. تحديث تذكرة
```
PUT /api/support/tickets/:id
```
**Request Body:**
```json
{
  "status": "in_progress" | "closed",
  "assigneeId": "string",
  "priority": "high" | "medium" | "low"
}
```

### 37. إضافة رد على تذكرة
```
POST /api/support/tickets/:id/messages
```
**Request Body:**
```json
{
  "message": "string"
}
```

---

## 🚚 Delivery Companies Endpoints

### 38. قائمة شركات التوصيل
```
GET /api/delivery/companies?status=&search=
```
**Response:**
```json
{
  "companies": [
    {
      "id": "string",
      "name": "string",
      "contact": "string",
      "phone": "string",
      "email": "string",
      "status": "active" | "inactive",
      "stores": 12,
      "monthlyOrders": 450,
      "rating": 4.5,
      "apiEndpoint": "url",
      "apiKey": "string",
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### 39. تفاصيل شركة توصيل
```
GET /api/delivery/companies/:id
```

### 40. إنشاء شركة توصيل
```
POST /api/delivery/companies
```
**Request Body:**
```json
{
  "name": "string",
  "contact": "string",
  "phone": "string",
  "email": "string",
  "apiEndpoint": "url",
  "apiKey": "string",
  "status": "active"
}
```

### 41. تحديث شركة توصيل
```
PUT /api/delivery/companies/:id
```

### 42. حذف شركة توصيل
```
DELETE /api/delivery/companies/:id
```

### 43. إحصائيات شركات التوصيل
```
GET /api/delivery/companies/stats
```
**Response:**
```json
{
  "totalCompanies": 3,
  "activeCompanies": 2,
  "totalMonthlyOrders": 920
}
```

---

## 💳 Payment Methods Endpoints

### 44. قائمة طرق الدفع
```
GET /api/payment/methods?status=
```
**Response:**
```json
{
  "methods": [
    {
      "id": "string",
      "name": "string",
      "provider": "string",
      "type": "credit_card" | "bank_transfer" | "e_wallet" | "cash_on_delivery",
      "status": "active" | "inactive",
      "stores": 18,
      "monthlyTransactions": 1240,
      "successRate": 98.5,
      "fees": 2.5,
      "feesType": "percentage" | "fixed",
      "config": {},
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### 45. تفاصيل طريقة الدفع
```
GET /api/payment/methods/:id
```

### 46. إنشاء طريقة دفع
```
POST /api/payment/methods
```
**Request Body:**
```json
{
  "name": "string",
  "provider": "string",
  "type": "credit_card" | "bank_transfer" | "e_wallet" | "cash_on_delivery",
  "fees": 2.5,
  "feesType": "percentage" | "fixed",
  "config": {},
  "status": "active"
}
```

### 47. تحديث طريقة دفع
```
PUT /api/payment/methods/:id
```

### 48. حذف طريقة دفع
```
DELETE /api/payment/methods/:id
```

### 49. إحصائيات طرق الدفع
```
GET /api/payment/methods/stats
```
**Response:**
```json
{
  "totalMethods": 4,
  "activeMethods": 4,
  "totalTransactions": 3300,
  "averageSuccessRate": 98.125
}
```

---

## 🔧 System APIs

### System Authentication Endpoints

### 50. تسجيل الدخول (System)
```
POST /system-user-auth/login
```
**Request Body:**
```json
{
  "email": "string",
  "password": "string"
}
```
**Response:**
```json
{
  "success": true,
  "token": "jwt_token_here",
  "user": {
    "id": "string",
    "username": "string",
    "name": "string",
    "role": "owner" | "employee" | "support",
    "email": "string"
  }
}
```

### 51. تسجيل الخروج (System)
```
POST /system-user-auth/logout
```
**Headers:** `Authorization: Bearer {token}`
**Response:**
```json
{
  "success": true,
  "message": "تم تسجيل الخروج بنجاح"
}
```

---

### System Store Endpoints

### 52. قائمة المتاجر (System)
```
GET /stores/system
```
**Headers:** `Authorization: Bearer {token}`
**Response:**
```json
{
  "stores": [
    {
      "id": "string",
      "name": "string",
      "owner": "string",
      "ownerEmail": "string",
      "subscriptionId": "string",
      "subscriptionPlan": "Premium" | "Pro" | "Basic",
      "status": "active" | "inactive" | "expired",
      "revenue": 45000,
      "orders": 234,
      "expiryDate": "2024-12-31",
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-11-15T00:00:00Z"
    }
  ],
  "total": 24
}
```

### 53. إنشاء متجر (System)
```
POST /stores/system
```
**Headers:** `Authorization: Bearer {token}`
**Request Body:**
```json
{
  "name": "string",
  "owner": "string",
  "ownerEmail": "string",
  "subscriptionPlanId": "string",
  "status": "active"
}
```
**Response:**
```json
{
  "success": true,
  "data": {
    "id": "string",
    "name": "string",
    "owner": "string",
    "ownerEmail": "string",
    "subscriptionId": "string",
    "status": "active",
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

### 54. تفاصيل متجر (System)
```
GET /stores/system/{id}
```
**Headers:** `Authorization: Bearer {token}`
**Response:**
```json
{
  "success": true,
  "data": {
    "id": "string",
    "name": "string",
    "owner": "string",
    "ownerEmail": "string",
    "subscriptionId": "string",
    "subscriptionPlan": "Premium" | "Pro" | "Basic",
    "status": "active" | "inactive" | "expired",
    "revenue": 45000,
    "orders": 234,
    "expiryDate": "2024-12-31",
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-11-15T00:00:00Z"
  }
}
```

### 55. تحديث متجر (System)
```
PUT /stores/system/{id}
```
**Headers:** `Authorization: Bearer {token}`
**Request Body:**
```json
{
  "name": "string",
  "owner": "string",
  "ownerEmail": "string",
  "subscriptionPlanId": "string",
  "status": "active" | "inactive"
}
```
**Response:**
```json
{
  "success": true,
  "data": {
    "id": "string",
    "name": "string",
    "owner": "string",
    "ownerEmail": "string",
    "status": "active",
    "updatedAt": "2024-11-15T00:00:00Z"
  },
  "message": "تم تحديث المتجر بنجاح"
}
```

### 56. حذف متجر (System)
```
DELETE /stores/system/{id}
```
**Headers:** `Authorization: Bearer {token}`
**Response:**
```json
{
  "success": true,
  "message": "تم حذف المتجر بنجاح"
}
```

---

### System Employees

*Note: System employee endpoints will be added here when available*

---

### Plan Endpoints

*Note: Plan endpoints will be added here when available*

---

### System Subscription Endpoints

### 57. جميع الاشتراكات (System)
```
GET /subscription/system/all
```
**Headers:** `Authorization: Bearer {token}`
**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "string",
      "storeId": "string",
      "storeName": "string",
      "planId": "string",
      "planName": "string",
      "startDate": "2024-01-01",
      "endDate": "2024-12-31",
      "status": "active" | "expired" | "cancelled" | "paused",
      "autoRenew": true,
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### 58. البحث في الاشتراكات (System)
```
PUT /subscription/system/search
```
**Headers:** `Authorization: Bearer {token}`
**Request Body:**
```json
{
  "storeId": "string",
  "planId": "string",
  "status": "active" | "expired" | "cancelled" | "paused",
  "dateFrom": "2024-01-01",
  "dateTo": "2024-12-31"
}
```
**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "string",
      "storeId": "string",
      "storeName": "string",
      "planId": "string",
      "planName": "string",
      "startDate": "2024-01-01",
      "endDate": "2024-12-31",
      "status": "active",
      "autoRenew": true
    }
  ]
}
```

### 59. تحديث اشتراك (System)
```
PUT /subscription/system/{id}
```
**Headers:** `Authorization: Bearer {token}`
**Request Body:**
```json
{
  "planId": "string",
  "startDate": "2024-01-01",
  "endDate": "2024-12-31",
  "autoRenew": true
}
```
**Response:**
```json
{
  "success": true,
  "data": {
    "id": "string",
    "storeId": "string",
    "storeName": "string",
    "planId": "string",
    "planName": "string",
    "startDate": "2024-01-01",
    "endDate": "2024-12-31",
    "status": "active",
    "autoRenew": true,
    "updatedAt": "2024-11-15T00:00:00Z"
  },
  "message": "تم تحديث الاشتراك بنجاح"
}
```

### 60. إيقاف الاشتراك مؤقتاً (System)
```
PUT /subscription/system/{id}/pause
```
**Headers:** `Authorization: Bearer {token}`
**Response:**
```json
{
  "success": true,
  "data": {
    "id": "string",
    "status": "paused",
    "pausedAt": "2024-11-15T00:00:00Z"
  },
  "message": "تم إيقاف الاشتراك مؤقتاً"
}
```

### 61. استئناف الاشتراك (System)
```
PUT /subscription/system/{id}/resume
```
**Headers:** `Authorization: Bearer {token}`
**Response:**
```json
{
  "success": true,
  "data": {
    "id": "string",
    "status": "active",
    "resumedAt": "2024-11-15T00:00:00Z"
  },
  "message": "تم استئناف الاشتراك بنجاح"
}
```

### 62. إلغاء الاشتراك (System)
```
PUT /subscription/system/{id}/cancel
```
**Headers:** `Authorization: Bearer {token}`
**Response:**
```json
{
  "success": true,
  "data": {
    "id": "string",
    "status": "cancelled",
    "cancelledAt": "2024-11-15T00:00:00Z"
  },
  "message": "تم إلغاء الاشتراك بنجاح"
}
```

### 63. تجديد الاشتراك (System)
```
PUT /subscription/system/{id}/renew
```
**Headers:** `Authorization: Bearer {token}`
**Request Body (Optional):**
```json
{
  "duration": "monthly" | "yearly"
}
```
**Response:**
```json
{
  "success": true,
  "data": {
    "id": "string",
    "status": "active",
    "startDate": "2024-11-15",
    "endDate": "2024-12-15",
    "renewedAt": "2024-11-15T00:00:00Z"
  },
  "message": "تم تجديد الاشتراك بنجاح"
}
```

---

## 🧠 Financial AI Endpoints

كل هذه الـ endpoints محمية بـ `SystemUserJwtAuthGuard` (دور `owner` في الواجهة).

كل مبلغ يرجع بالعملتين معاً — `{ "usd": number, "iqd": number }` — مع `rate` في الاستجابة،
لأن كلفة النماذج بالدولار بينما الباقات والاشتراكات بالدينار. سعر الصرف من متغير البيئة
`USD_TO_IQD_RATE` (افتراضياً 1350)، والتبديل في الواجهة عرض فقط.

### 1. ملخص مالي عام
```
GET /api/v1/financial-ai/summary?from&to
```
يرجع: `cost`, `creditRevenue`, `subscriptionRevenue`, `revenue`, `margin`, `marginPercent`,
`deferredLiability` (رصيد مدفوع غير مستهلك — التزام وليس ربحاً)، `deferredCredits`,
`usage` (تشغيلات، إنشاء متاجر، طلبات محرر، رموز، نسبة الذاكرة المؤقتة، تشغيلات فاشلة)،
`fullyPriced`، `byModel`، و`monthly` (سلسلة شهرية للإيراد مقابل الكلفة).

### 2. الكلفة والإيراد لكل متجر
```
GET /api/v1/financial-ai/stores?page&limit&search&sort&from&to
```
`sort`: `cost` (افتراضي) | `revenue` | `margin` | `generations`.

الكلفة مأخوذة من عدّاد الرموز الفعلي لكل تشغيل. إيراد الاشتراك دقيق لكل متجر. أما إيراد
الرصيد فيُوزَّع: الباقات تُشترى باسم المستخدم لا باسم المتجر، فيُقسَّم على متاجره بنسبة ما
كلّفه كل متجر خلال الفترة (وبالتساوي إن لم تكن هناك كلفة). عند وجود متجر واحد — وهي الحالة
الشائعة — التوزيع دقيق. صف `غير مرتبط بمتجر` يجمع التشغيلات التي لا متجر لها (اقتراح تصميم
مرفوض، أو تشغيل فشل قبل تجهيز المتجر) حتى تبقى الصفوف مطابقة للملخص.

### 3. تفاصيل متجر واحد
```
GET /api/v1/financial-ai/stores/:storeId?from&to
```
يرجع التوزيع حسب النموذج، آخر 100 تشغيل، ومشتريات مالك المتجر.

### 4. سجل شراء الرصيد
```
GET /api/v1/financial-ai/purchases?page&limit&search&status&from&to
```
`status`: `PENDING` | `PAID` | `FAILED` | `EXPIRED`. عملية `PAID` بلا `fulfilledAt` تعني
رصيداً قُبض ثمنه ولم يُسلَّم — تظهر في الواجهة كتنبيه مستقل.

---

## 🔒 Authorization & Permissions

### Roles:
- **owner**: وصول كامل لجميع الـ endpoints
- **employee**: وصول محدود (المتاجر، المحاسبة، بدون الموظفين والخطط)
- **support**: وصول للدعم الفني فقط + الرئيسية

### Protected Routes:
- جميع الـ endpoints تتطلب `Authorization: Bearer {token}` في الـ headers
- بعض الـ endpoints (مثل الموظفين، الخطط) تتطلب دور `owner`

---

## 📝 Response Format

### Success Response:
```json
{
  "success": true,
  "data": {},
  "message": "string"
}
```

### Error Response:
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "string",
    "details": {}
  }
}
```

### Pagination Response:
```json
{
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

---

## 🔄 Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error

---

## 📌 Notes

1. جميع التواريخ بتنسيق ISO 8601: `YYYY-MM-DDTHH:mm:ssZ`
2. العملة الأساسية: الدينار العراقي (IQD)
3. جميع الـ IDs من نوع UUID أو String
4. البحث والفلترة اختيارية في جميع الـ endpoints
5. الـ Pagination افتراضي: page=1, limit=20
