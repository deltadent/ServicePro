# 📋 Complete Quote Workflow Guide - ServicePro

## Overview
This guide covers the complete process from creating a quote to receiving customer responses with scheduling preferences. The system is designed for Saudi market deployment with ZATCA compliance, WhatsApp integration, and Accept/Reject workflow.

---

## 🎯 Complete Workflow Steps

### 1. **Create Quote** 
📍 **Location**: Quote Management → New Quote

**Steps:**
1. Click **"New Quote"** button
2. Select customer from dropdown
3. Choose template (optional) for pre-filled items
4. Fill in quote details:
   - Title (required)
   - Description (optional) 
   - Valid until date
   - Terms & conditions
5. Add line items:
   - Service items
   - Parts/labor/fees
   - Set quantities and prices
6. Configure pricing:
   - Tax rate (default 8.25% for Saudi VAT)
   - Discounts if applicable
7. Click **"Create Quote"**

**Result**: Quote created with status "draft"

---

### 2. **Edit Quote** (Draft Status Only)
📍 **Location**: Quote Management → Actions → Edit

**Steps:**
1. Find quote in Quote Management table
2. Click **⋮ (More)** → **"Edit"** 
3. Modify any quote details
4. Update line items as needed
5. Click **"Update Quote"**

**Result**: Quote updated, remains in "draft" status

---

### 3. **Share Quote** (Send to Customer)
📍 **Location**: Quote Management → Actions → Share Quote

**Steps:**
1. Find draft quote in table
2. Click **⋮ (More)** → **"Share Quote"**
3. **Quote Share Dialog Opens** with options:

#### **3a. WhatsApp Sharing** (if enabled)
- **Requirements**: Customer must have phone_mobile and whatsapp_enabled=true
- Click **"Send WhatsApp"** button
- WhatsApp opens with pre-filled message including response link
- Send the message from WhatsApp
- Click **"Mark as Sent"** in dialog

#### **3b. Email Sharing**
- **Requirements**: Customer must have email address
- Click **"Send Email"** button  
- Email client opens with pre-filled subject and message
- Send the email from your email client
- Click **"Mark as Sent"** in dialog

#### **3c. Manual Link Sharing**
- **Copy Response Link**: For customer to accept/decline + schedule
- **Copy View Link**: For read-only quote viewing
- **Copy Templates**: Email/WhatsApp message templates
- Share links manually via any method
- Click **"Mark as Sent"** when done

**Result**: Quote status changes to "sent"

---

### 4. **Customer Receives Quote**

**Customer gets one of these links:**

#### **Option A: Response Link** (Recommended)
`https://yourapp.com/quote/[id]/respond`
- Customer can view full quote details
- Accept/Reject with scheduling preferences
- Payment preference selection

#### **Option B: View Link** (Read-only)  
`https://yourapp.com/quote/[id]`
- Customer sees quote details
- Click "Respond to Quote" → redirects to response link

---

### 5. **Customer Responds to Quote**
📍 **Location**: Customer uses response link

**Customer Experience:**
1. **Views Quote Details**: Full breakdown, customer info, totals
2. **Selects Response**: Accept or Reject
3. **If Accepting**:
   - Choose payment preference: "Pay Now" or "Pay Later"
   - Select 1-3 preferred dates (next 30 days)
   - Select 2+ time slots:
     - Morning (8AM-12PM)
     - Afternoon (12PM-5PM)  
     - Evening (5PM-8PM)
   - Add optional notes
4. **If Rejecting**:
   - Provide reason (required, min 10 characters)
5. Click **"Accept Quote"** or **"Decline Quote"**

**Result**: 
- Quote status changes to "approved" or "declined"
- Response record created with customer preferences
- Admin receives notification

---

### 6. **Admin Reviews Response** 
📍 **Location**: Quote Management table

**Quote Status Updates:**
- ✅ **Approved**: Green badge, customer accepted
- ❌ **Declined**: Red badge, customer rejected  
- 👁️ **Viewed**: Customer opened quote but no response yet

**View Customer Response:**
1. Quote status shows "approved" or "declined"
2. Customer preferences stored in system:
   - Payment preference (Pay Now/Pay Later)
   - Preferred dates and time slots
   - Customer notes/reason for declining

---

### 7. **Convert to Job** (Approved Quotes Only)
📍 **Location**: Quote Management → Actions → Convert to Job

**Steps:**
1. Find approved quote
2. Click **⋮ (More)** → **"Convert to Job"**
3. Job created with customer scheduling preferences pre-filled
4. Quote status changes to "converted"

---

### 8. **Download ZATCA PDF** (Any Status)
📍 **Location**: Quote Management → Actions → Download ZATCA PDF

**Steps:**
1. Click **⋮ (More)** → **"Download ZATCA PDF"**
2. PDF generates with:
   - English language (Arabic support coming later)
   - ZATCA compliance elements
   - QR code for verification
   - Professional Saudi green theme
   - SAR currency formatting

---

## 🔧 Technical Implementation Details

### **URLs Generated:**
```
Response URL: /quote/{id}/respond
View URL: /quote/{id}
```

### **Message Templates:**

#### **WhatsApp Message:**
```
Hello [Customer]! 👋

Your ServicePro quote is ready:
📋 Quote #[number]
🔧 [Service Title]
💰 $[amount] SAR

Click here to view and respond: [response_url]

Questions? Just reply to this message!
```

#### **Email Message:**
```
Subject: Quote [number] - [title]

Hello [Customer],

Your quote is ready! Here are the details:
- Quote #: [number]
- Service: [title] 
- Total: $[amount] SAR
- Valid Until: [date]

To view and respond: [response_url]
To view details only: [view_url]

Best regards, ServicePro Team
```

### **Customer Response Data Captured:**
```json
{
  "status": "accepted|rejected",
  "payment_preference": "pay_now|pay_later", 
  "preferred_dates": ["2025-01-15", "2025-01-16"],
  "preferred_times": ["morning", "afternoon"],
  "customer_notes": "Customer feedback...",
  "response_ip": "IP address",
  "response_device_info": "Browser/device data"
}
```

---

## ⚡ Quick Reference

| Status | Color | Actions Available |
|--------|--------|------------------|
| **Draft** | Gray | Edit, Share, Download PDF |
| **Sent** | Blue | Download PDF, View Response |
| **Viewed** | Yellow | Download PDF, View Response |
| **Approved** | Green | Convert to Job, Download PDF |
| **Declined** | Red | Download PDF, View Reason |
| **Converted** | Purple | Download PDF (Job Created) |

---

## 🚀 Saudi Market Features

- ✅ **ZATCA Compliance**: QR codes, VAT handling, compliance statements
- ✅ **SAR Currency**: All amounts in Saudi Riyal
- ✅ **WhatsApp Integration**: Direct messaging for Saudi market preference  
- ✅ **Accept/Reject System**: No signature required, modern workflow
- ✅ **Scheduling System**: Customer selects multiple time preferences
- ✅ **Payment Options**: Pay Now/Pay Later flexibility
- ✅ **Mobile First**: Responsive design for mobile quote responses

---

## 📱 Mobile Experience

**Customer Response Page** is fully optimized for mobile:
- Touch-friendly checkboxes for dates/times
- Accordion layout for better navigation  
- Single-column forms on mobile
- Easy accept/reject buttons
- Mobile-optimized date picker

---

## 🔒 Security Features

- **Response Tracking**: IP address and device fingerprinting
- **Link Validation**: Quotes expire, can't respond to expired quotes
- **Public Access**: Response pages work without login (secure UUID links)
- **RLS Policies**: Database-level security for quote access

The system is now ready for production deployment in the Saudi market! 🇸🇦