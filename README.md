# نموذج طلب استخراج صورة رسمية من حكم - ASP.NET Core MVC

تحويل مشروع React/Vite إلى ASP.NET Core MVC مع الحفاظ على نفس الديزاين والمنطق بالكامل.

## تشغيل المشروع

```bash
cd "LegalRequestForm"
dotnet run
```

ثم افتح المتصفح على: **http://localhost:5243**

## هيكل المشروع

```
LegalRequestForm/
├── Controllers/
│   └── HomeController.cs       ← المتحكم الرئيسي
├── Models/
│   └── LegalRequestModel.cs    ← النموذج + أنواع الدعاوى + مولّد البيانات
├── Views/
│   ├── Home/
│   │   └── Index.cshtml        ← الصفحة الرئيسية (كل المنطق + الـ HTML)
│   └── Shared/
│       └── _Layout.cshtml      ← القالب العام
└── wwwroot/
    └── css/
        └── site.css            ← الـ CSS الكامل
```

## المميزات

- ✅ نفس الديزاين الاحترافي المظلم (Dark UI)
- ✅ ورقة A4 رسمية مع علامة مائية قضائية
- ✅ التوقيع الإلكتروني بالرسم (Canvas Drawing)
- ✅ توليد بيانات عشوائية (AJAX)
- ✅ تحميل PDF (Client-side via jsPDF + html2canvas)
- ✅ طباعة A4 متوافقة
- ✅ رسائل تغذية راجعة (Feedback Modal)
- ✅ دعم RTL عربي كامل
- ✅ خطوط Google Cairo + Amiri
