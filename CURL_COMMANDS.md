# API cURL Commands

Replace the following placeholders:
- `BASE_URL` - Your API base URL (e.g., `http://localhost:3000` or `https://api.example.com`)
- `ACCESS_TOKEN` - JWT access token from authentication
- `ORGANIZATION_ID` - UUID of the organization
- `TOPIC_ID` - UUID of the topic
- `ARTICLE_ID` - UUID of the article

---

## 🔐 Authentication

### Login
```bash
curl -X POST "${BASE_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "your_password"
  }'
```

### Signup
```bash
curl -X POST "${BASE_URL}/auth/signup" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "your_password",
    "name": "John Doe",
    "organization_name": "My Company",
    "domain_url": "https://mycompany.com",
    "role": "Admin"
  }'
```

---

## 👤 User APIs (Auto-detect Organization from Token)

All these endpoints automatically use the authenticated user's organization.

### Get Organization Details
```bash
curl -X GET "${BASE_URL}/organization" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}"
```

### Update Organization
```bash
curl -X PUT "${BASE_URL}/organization" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Company Name",
    "description": "Updated description"
  }'
```

### Get Keywords (User's Organization)
```bash
curl -X GET "${BASE_URL}/organization/keywords" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}"
```

### Get Topics (User's Organization)
```bash
# Get all topics
curl -X GET "${BASE_URL}/organization/topics" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}"

# Get topics by status
curl -X GET "${BASE_URL}/organization/topics?status=Completed" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}"

curl -X GET "${BASE_URL}/organization/topics?status=pending" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}"
```

### Generate Article (User's Organization)
```bash
# Generate blog article
curl -X POST "${BASE_URL}/organization/articles/generate" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "topicId": "${TOPIC_ID}",
    "source": "blog"
  }'

# Generate LinkedIn post
curl -X POST "${BASE_URL}/organization/articles/generate" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "topicId": "${TOPIC_ID}",
    "source": "linkedin"
  }'

# Generate Twitter post
curl -X POST "${BASE_URL}/organization/articles/generate" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "topicId": "${TOPIC_ID}",
    "source": "twitter"
  }'

# Generate Reddit post
curl -X POST "${BASE_URL}/organization/articles/generate" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "topicId": "${TOPIC_ID}",
    "source": "reddit"
  }'
```

### Get Articles (User's Organization)
```bash
# Get all articles
curl -X GET "${BASE_URL}/organization/articles" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}"

# Get articles for specific topic
curl -X GET "${BASE_URL}/organization/articles?topicId=${TOPIC_ID}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}"
```

### Get Credit Balance (User's Organization)
```bash
curl -X GET "${BASE_URL}/organization/${ORGANIZATION_ID}/credits" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}"
```

### Get Credit Ledger (User's Organization)
```bash
# Get all ledger entries
curl -X GET "${BASE_URL}/organization/${ORGANIZATION_ID}/credits/ledger" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}"

# Get ledger with filters
curl -X GET "${BASE_URL}/organization/${ORGANIZATION_ID}/credits/ledger?platform=blog&actionType=ARTICLE_CREATE&page=1&pageSize=50" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}"

# Get ledger with date range
curl -X GET "${BASE_URL}/organization/${ORGANIZATION_ID}/credits/ledger?startDate=2024-01-01T00:00:00Z&endDate=2024-01-31T23:59:59Z" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}"

# Get ledger for specific platform
curl -X GET "${BASE_URL}/organization/${ORGANIZATION_ID}/credits/ledger?platform=linkedin" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}"
```

---

## 🔧 Admin APIs (Explicit Organization ID)

These endpoints require explicit `organizationId` in the request.

### Generate Keywords (Admin)
```bash
curl -X POST "${BASE_URL}/admin/generate-keywords" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "organizationId": "${ORGANIZATION_ID}"
  }'
```

### Get Keywords (Admin - Any Organization)
```bash
curl -X GET "${BASE_URL}/admin/keywords/${ORGANIZATION_ID}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}"
```

### Generate Topics (Admin)
```bash
curl -X POST "${BASE_URL}/admin/generate-topics" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "organizationId": "${ORGANIZATION_ID}"
  }'
```

### Get Topics (Admin - Any Organization)
```bash
# Get all topics
curl -X GET "${BASE_URL}/admin/topics/${ORGANIZATION_ID}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}"

# Get topics by status
curl -X GET "${BASE_URL}/admin/topics/${ORGANIZATION_ID}?status=Completed" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}"
```

### Generate Summary (Admin)
```bash
curl -X POST "${BASE_URL}/admin/generate-summary" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "organizationId": "${ORGANIZATION_ID}"
  }'
```

### Grant Credits (Admin)
```bash
curl -X POST "${BASE_URL}/admin/organizations/${ORGANIZATION_ID}/credits/grant" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "creditsAmount": 100,
    "reason": "Monthly subscription credits",
    "metadata": {
      "subscriptionId": "sub_123",
      "plan": "pro"
    }
  }'
```

---

## 📊 Example Usage

### Complete Workflow: Generate Article with Credits

```bash
# 1. Login
TOKEN=$(curl -s -X POST "${BASE_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password"
  }' | jq -r '.session.access_token')

# 2. Check credit balance
curl -X GET "${BASE_URL}/organization/${ORGANIZATION_ID}/credits" \
  -H "Authorization: Bearer ${TOKEN}"

# 3. Get topics
curl -X GET "${BASE_URL}/organization/topics?status=pending" \
  -H "Authorization: Bearer ${TOKEN}"

# 4. Generate article (deducts credits automatically)
curl -X POST "${BASE_URL}/organization/articles/generate" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "topicId": "${TOPIC_ID}",
    "source": "blog"
  }'

# 5. Check updated credit balance
curl -X GET "${BASE_URL}/organization/${ORGANIZATION_ID}/credits" \
  -H "Authorization: Bearer ${TOKEN}"

# 6. View credit ledger
curl -X GET "${BASE_URL}/organization/${ORGANIZATION_ID}/credits/ledger" \
  -H "Authorization: Bearer ${TOKEN}"
```

---

## 🚨 Error Responses

### Insufficient Credits (402)
```json
{
  "error": "Insufficient credits",
  "message": "Insufficient credits. Required: 10, Available: 5"
}
```

### Unauthorized (401)
```json
{
  "error": "Unauthorized",
  "message": "Access token is required"
}
```

### Validation Error (400)
```json
{
  "error": "Topic ID is required"
}
```

---

## 📝 Notes

1. **User APIs**: Automatically detect organization from the authenticated user's token
2. **Admin APIs**: Require explicit `organizationId` in request body or URL params
3. **Credit Deduction**: Happens automatically when generating articles
4. **Platforms**: Supported values are `blog`, `linkedin`, `twitter`, `reddit`
5. **Credit Ledger**: Append-only audit log, supports pagination and filtering

