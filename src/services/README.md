# API Services

هذا المجلد يحتوي على جميع خدمات الـ API للربط مع الباك إند.

## الملفات المتوفرة

### 1. `systemAuthService.ts`
خدمة المصادقة للنظام:
- `login(email, password)` - تسجيل الدخول
- `logout()` - تسجيل الخروج

### 2. `systemStoresService.ts`
خدمة إدارة المتاجر:
- `getAllStores()` - الحصول على جميع المتاجر
- `getStoreById(id)` - الحصول على متجر محدد
- `createStore(storeData)` - إنشاء متجر جديد
- `updateStore(id, storeData)` - تحديث متجر
- `deleteStore(id)` - حذف متجر

### 3. `systemSubscriptionsService.ts`
خدمة إدارة الاشتراكات:
- `getAllSubscriptions()` - الحصول على جميع الاشتراكات
- `searchSubscriptions(searchParams)` - البحث في الاشتراكات
- `updateSubscription(id, updateData)` - تحديث اشتراك
- `pauseSubscription(id)` - إيقاف الاشتراك مؤقتاً
- `resumeSubscription(id)` - استئناف الاشتراك
- `cancelSubscription(id)` - إلغاء الاشتراك
- `renewSubscription(id, renewData?)` - تجديد الاشتراك

## أمثلة الاستخدام

### تسجيل الدخول
```typescript
import { systemAuthService } from '../services';

try {
  const response = await systemAuthService.login({
    email: 'user@example.com',
    password: 'password123'
  });
  
  if (response.success) {
    localStorage.setItem('token', response.token);
    // Handle success
  }
} catch (error) {
  console.error('Login failed:', error);
}
```

### الحصول على المتاجر
```typescript
import { systemStoresService } from '../services';

try {
  const stores = await systemStoresService.getAllStores();
  console.log('Stores:', stores.stores);
} catch (error) {
  console.error('Failed to fetch stores:', error);
}
```

### إدارة الاشتراكات
```typescript
import { systemSubscriptionsService } from '../services';

// إيقاف اشتراك مؤقتاً
try {
  const subscription = await systemSubscriptionsService.pauseSubscription('subscription-id');
  console.log('Subscription paused:', subscription);
} catch (error) {
  console.error('Failed to pause subscription:', error);
}

// تجديد اشتراك
try {
  const subscription = await systemSubscriptionsService.renewSubscription(
    'subscription-id',
    { duration: 'monthly' }
  );
  console.log('Subscription renewed:', subscription);
} catch (error) {
  console.error('Failed to renew subscription:', error);
}
```

## ملاحظات

- جميع الـ services تستخدم `axiosInstance` من `utils/AxiosInstance`
- الـ token يتم إضافته تلقائياً في الـ headers عبر interceptor
- في حالة 401 (Unauthorized)، سيتم حذف الـ token وإعادة التوجيه إلى صفحة تسجيل الدخول تلقائياً
