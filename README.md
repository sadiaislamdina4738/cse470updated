project:
  name: EventEase - Simple Local Event Organizer
  description: Event discovery, creation, RSVP, chat, QR sharing, and feedback with JWT auth.
  stack:
    backend: [Node.js, Express.js, MongoDB (Mongoose), JWT, Socket.io]
    frontend: [React.js, Axios, React Router, Socket.io-client, QRCode.react]
  base_urls:
    backend: http://localhost:5000
    api_base: http://localhost:5000/api

security:
  auth_type: Bearer JWT
  header:
    name: Authorization
    format: "Bearer <token>"
  token_source:
    - on login/register responses (HTTP)
    - used in REST calls via Authorization header
    - used in Socket.io handshake auth: { token } (preferred) or query param token

errors:
  shape:
    - status: string ("success" | "error")
    - message: string
    - errors: optional array (express-validator: [{ msg, param, location, ... }])
  common_status_codes:
    - 200: OK
    - 201: Created
    - 400: Validation or bad request
    - 401: Unauthorized / Missing/Invalid token
    - 403: Forbidden (e.g., not event creator)
    - 404: Not found
    - 500: Server error

models:
  user:
    fields:
      _id: ObjectId
      username: string
      email: string
      password: string (hashed, never returned)
      eventsCreated: [ObjectId(Event)]
      eventsJoined: [ObjectId(Event)]
      createdAt: ISODate
    notes:
      - GET /api/auth/me returns user with "_id" (Mongoose doc)
      - login/register return user object with "id" key (value is _id)
  event:
    fields:
      _id: ObjectId
      title: string
      description: string
      category: string
      location: string
      coordinates: { lat: number, lng: number } (optional)
      schedule: ISODate
      creator: ObjectId(User) or populated User { _id, username }
      attendees: [User or ObjectId]
      pendingRequests: [User or ObjectId]
      waitlist: [User or ObjectId]
      requiresApproval: boolean (default true in UI, enforced in RSVP logic)
      banner: string (URL, optional)
      maxAttendees: number (default 100)
      isActive: boolean (true by default)
      createdAt: ISODate
  feedback:
    fields:
      _id: ObjectId
      userID: ObjectId(User) or populated { _id, username }
      eventID: ObjectId(Event)
      rating: number (1-5)
      comments: string (optional)
      createdAt: ISODate
  chat_message:
    fields:
      _id: ObjectId
      eventId: ObjectId(Event)
      userId: ObjectId(User) or populated { _id, username }
      message: string (1-500)
      createdAt: ISODate

rest_api:
  auth:
    - method: POST
      path: /api/auth/register
      auth: none
      body_schema:
        email: string (required, valid email)
        username: string (required, 3-30)
        password: string (required, >=6)
      success_response:
        status: success
        message: "User registered successfully"
        token: string (JWT)
        user:
          id: ObjectId (string)
          username: string
          email: string
      example_request:
        email: admin@gmail.com
        username: admin
        password: "secret123"
    - method: POST
      path: /api/auth/login
      auth: none
      body_schema:
        email: string (required, valid email)
        password: string (required)
      success_response:
        status: success
        message: "Login successful"
        token: string (JWT)
        user:
          id: ObjectId (string)
          username: string
          email: string
    - method: GET
      path: /api/auth/me
      auth: required
      headers: { Authorization: "Bearer <token>" }
      success_response:
        status: success
        user:
          _id: ObjectId (string)
          username: string
          email: string
          eventsCreated: [ObjectId]
          eventsJoined: [ObjectId]

  events:
    - method: GET
      path: /api/events
      auth: none
      query:
        category: string (optional)
        location: string (optional, case-insensitive regex)
        limit: number (1-100, optional)
      success_response:
        status: success
        events: [Event]
      notes:
        - creator, attendees, pendingRequests, waitlist are populated with username
    - method: POST
      path: /api/events/create
      auth: required
      body_schema:
        title: string (3-100, required)
        description: string (optional, <=1000)
        category: string (required)
        location: string (required)
        coordinates:
          lat: number (-90..90, optional)
          lng: number (-180..180, optional)
        schedule: ISODate (required)
        banner: string (optional, URL)
        maxAttendees: integer (1..1000, optional)
      success_response:
        status: success
        message: "Event created successfully"
        event: Event (creator populated with username)
    - method: POST
      path: /api/events/rsvp
      auth: required
      body_schema:
        eventId: ObjectId (string, required)
      behavior:
        - If event.isFull => add to waitlist (unless already on it)
        - If requiresApproval => add to pendingRequests
        - Else => add to attendees and push to user's eventsJoined
        - Prevent duplicates: already attending/pending/waitlist
        - Prevent for past events
      success_response:
        status: success
        message: string
        event: Event (creator populated)
        waitlisted: boolean (if applicable)
    - method: PUT
      path: /api/events/manage-attendees
      auth: required (must be event creator)
      body_schema:
        eventId: ObjectId (required)
        userId: ObjectId (required, target user)
        action: enum ["approve","reject","remove","promote-waitlist"]
      actions:
        approve:
          - move user from pendingRequests -> attendees
          - push event to user's eventsJoined
        reject:
          - remove user from pendingRequests
        remove:
          - remove user from attendees
          - pull event from user's eventsJoined
          - optionally promote first user from waitlist to attendees
        promote-waitlist:
          - move user from waitlist -> attendees
          - push event to user's eventsJoined
      success_response:
        status: success
        message: string
        event: Event (updated, populated creator/attendees/pendingRequests/waitlist)

  chat:
    - method: GET
      path: /api/events/chat
      auth: none
      query:
        eventId: ObjectId (required)
      success_response:
        status: success
        messages: [ChatMessage] (userId populated username; sorted oldest->newest; limit 100)
    - method: POST
      path: /api/events/chat
      auth: required
      body_schema:
        eventId: ObjectId (required)
        message: string (1-500, required)
      server_checks:
        - event exists
        - sender is creator OR attendee OR pending OR waitlist
      success_response:
        status: success
        message: "Message sent successfully"
        chatMessage: ChatMessage (userId populated)
      side_effects:
        - emits "new-message" via Socket.io room "event-<eventId>"

  feedback:
    - method: POST
      path: /api/events/feedback
      auth: required
      body_schema:
        eventId: ObjectId (required)
        rating: integer (1..5)
        comments: string (optional, <=500)
      server_checks:
        - event exists
        - user is in attendees
        - event has passed (schedule < now)
        - not already submitted by user
      success_response:
        status: success
        message: "Feedback submitted successfully"
        feedback: Feedback
    - method: GET
      path: /api/events/feedback/:eventId
      auth: none
      success_response:
        status: success
        feedback: [Feedback] (userID populated username, newest first)
        averageRating: number (1 decimal)
        totalFeedback: number

sockets:
  connection:
    url: http://localhost:5000 (same origin as server)
    handshake_auth:
      auth: { token: "<JWT>" }  # preferred
      or_query: "?token=<JWT>"  # alternative
    server_auth:
      - verifies token
      - loads user; attaches as socket.user
  rooms:
    - "event-<eventId>" per event chat
  client_events:
    - name: join-event-chat
      payload: "<eventId>"
      effect: server joins socket to "event-<eventId>"
    - name: leave-event-chat
      payload: "<eventId>"
      effect: server leaves room
    - name: send-message
      payload:
        eventId: ObjectId
        message: string (trimmed, 1..500)
      callback_response:
        success: boolean
        message: string
        data: ChatMessage (on success)
      server_checks:
        - event exists
        - user must be attending (stricter than HTTP API; HTTP also allows creator/pending/waitlist)
      server_emits:
        - to room "event-<eventId>": "new-message" with ChatMessage (userId populated)
  server_events:
    - name: new-message
      payload: ChatMessage

frontend_backend_flow:
  auth_flow:
    - register/login -> save token -> attach to Axios default Authorization header
    - AuthContext fetches /api/auth/me on load when token present
  events_flow:
    - list: GET /api/events with filters
    - create: POST /api/events/create (needs token)
    - rsvp: POST /api/events/rsvp (needs token)
    - manage: PUT /api/events/manage-attendees (needs token; only creator)
  chat_flow:
    - REST: GET /api/events/chat?eventId=... to load history
    - Socket: connect with token; join-event-chat; send-message; listen "new-message"
    - Fallback: If socket send fails, frontend posts to /api/events/chat
  feedback_flow:
    - list: GET /api/events/feedback/:eventId
    - submit: POST /api/events/feedback (needs token; attendee; after event time)

validation:
  library: express-validator
  failure_response:
    status: error
    message: "Validation failed"
    errors: [{ msg, param, location, ... }]

examples:
  curl:
    - name: Register
      cmd: >
        curl -X POST http://localhost:5000/api/auth/register
        -H "Content-Type: application/json"
        -d '{"email":"admin@gmail.com","username":"admin","password":"secret123"}'
    - name: Login
      cmd: >
        curl -X POST http://localhost:5000/api/auth/login
        -H "Content-Type: application/json"
        -d '{"email":"admin@gmail.com","password":"secret123"}'
    - name: Me
      cmd: >
        curl http://localhost:5000/api/auth/me
        -H "Authorization: Bearer <token>"
    - name: Get Events
      cmd: >
        curl "http://localhost:5000/api/events?category=Business&limit=20"
    - name: Create Event
      cmd: >
        curl -X POST http://localhost:5000/api/events/create
        -H "Authorization: Bearer <token>"
        -H "Content-Type: application/json"
        -d '{"title":"Conf","category":"Business","location":"HQ","schedule":"2025-08-22T06:02:00.000Z","banner":"https://...","maxAttendees":50}'
    - name: RSVP
      cmd: >
        curl -X POST http://localhost:5000/api/events/rsvp
        -H "Authorization: Bearer <token>"
        -H "Content-Type: application/json"
        -d '{"eventId":"<eventId>"}'
    - name: Manage Attendees (approve)
      cmd: >
        curl -X PUT http://localhost:5000/api/events/manage-attendees
        -H "Authorization: Bearer <token>"
        -H "Content-Type: application/json"
        -d '{"eventId":"<eventId>","userId":"<userId>","action":"approve"}'
    - name: Chat History
      cmd: >
        curl "http://localhost:5000/api/events/chat?eventId=<eventId>"
    - name: Send Chat Message (HTTP)
      cmd: >
        curl -X POST http://localhost:5000/api/events/chat
        -H "Authorization: Bearer <token>"
        -H "Content-Type: application/json"
        -d '{"eventId":"<eventId>","message":"Hello!"}'
    - name: Submit Feedback
      cmd: >
        curl -X POST http://localhost:5000/api/events/feedback
        -H "Authorization: Bearer <token>"
        -H "Content-Type: application/json"
        -d '{"eventId":"<eventId>","rating":5,"comments":"Great!"}'
    - name: Get Feedback
      cmd: >
        curl "http://localhost:5000/api/events/feedback/<eventId>"