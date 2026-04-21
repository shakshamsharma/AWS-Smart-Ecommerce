# API Reference

Base URL: `https://shop.yourdomain.com/api`

All protected endpoints require:
```
Authorization: Bearer <jwt_token>
```

---

## Authentication

### POST /auth/register
Create a new user account.

**Request**
```json
{ "name": "Rahul Sharma", "email": "rahul@example.com", "password": "Secret@123" }
```
**Response 201**
```json
{ "token": "eyJ...", "user": { "id": 1, "name": "Rahul Sharma", "email": "rahul@example.com" } }
```

### POST /auth/login
```json
{ "email": "rahul@example.com", "password": "Secret@123" }
```
**Response 200** — same shape as register.

### GET /auth/me  🔒
Returns current user profile.

---

## Products

### GET /products
```
GET /products?page=1&limit=20&category=electronics&sort=price&order=ASC
```
**Response 200**
```json
{
  "products": [{ "id": 1, "name": "...", "price": 4999.00, "stock_qty": 200, "image_url": "..." }],
  "total": 42,
  "page": 1,
  "limit": 20
}
```

### GET /products/search?q=headphones
Returns up to 10 matching products. Cached 60 seconds.

### GET /products/:id
Single product with full description.

### POST /products  🔒 (admin)
Multipart form with optional `image` file upload.

---

## Cart  🔒

### GET /cart
Returns cart array: `[{ "product_id": 1, "quantity": 2 }]`

### POST /cart/add
```json
{ "product_id": 1, "quantity": 1 }
```

### PUT /cart/update
```json
{ "product_id": 1, "quantity": 3 }
```
Set `quantity: 0` to remove item.

### DELETE /cart/clear

---

## Orders  🔒

### POST /orders/checkout
```json
{
  "items": [{ "product_id": 1, "quantity": 2 }],
  "shipping_address": {
    "name": "Rahul Sharma",
    "address": "123 MG Road",
    "city": "Mumbai",
    "pincode": "400001",
    "phone": "+919876543210"
  },
  "payment_method": "cod"
}
```
**Response 201**
```json
{ "order_id": "uuid", "total": 9998.00, "status": "pending" }
```
**Response 409** — if inventory insufficient.

### GET /orders
Last 20 orders for authenticated user.

### GET /orders/:id
Full order with line items.

---

## Metrics  🔒 (admin)

### GET /metrics/dashboard
Returns live CloudWatch data: instance counts, CPU series, request series.

---

## Health Check

### GET /health
No auth required. Returns `200 OK` for ALB health checks.
```json
{ "status": "healthy", "uptime": 3600, "timestamp": "2025-01-01T00:00:00.000Z" }
```

---

## Error responses

All errors follow:
```json
{ "error": "Human-readable message" }
```

| Status | Meaning |
|--------|---------|
| 400 | Validation error |
| 401 | Missing/expired JWT |
| 403 | Admin access required |
| 404 | Resource not found |
| 409 | Conflict (e.g. duplicate email, out of stock) |
| 429 | Rate limit exceeded (200 req/min per IP) |
| 500 | Internal server error |
