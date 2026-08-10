# API Documentation

## 1. Authentication
### Login
`POST /api/auth/login`
- **Request Body**:
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```
- **Response (200 OK)**:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 3600
}
```

## 2. Events
### List Events
`GET /api/events?page=0&size=10`
- **Response (200 OK)**:
```json
[
  {
    "id": 1,
    "title": "Tech Conference 2026",
    "availableSeats": 150,
    "price": 49.99
  }
]
```

## 3. Bookings
### Create Booking
`POST /api/bookings`
- **Request Body**:
```json
{
  "eventId": 1,
  "seatId": "B22"
}
```
- **Response (201 Created)**:
```json
{
  "bookingId": 505,
  "status": "CONFIRMED",
  "timestamp": "2026-05-13T16:15:00Z"
}
```
- **Error (409 Conflict)**:
```json
{
  "error": "CONFLICT",
  "message": "Seat B22 is already locked by another session."
}
```
- **Error (404 Not Found)**:
```json
{
  "error": "NOT_FOUND",
  "message": "Event with ID 1 does not exist."
}
```
