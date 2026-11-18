# ConfigFlow (MessagePack round-trip)

A small web app where a logged-in user can browse `.msgpack` config files, view them in a structured form next to the video they describe, edit them, and save them back as valid MessagePack.

Anything in **[square brackets]** still needs your own details before submitting.

## Stack

- Frontend: React, TypeScript, Tailwind, react-router, axios
- Backend: Node.js, Express, TypeScript
- Database: PostgreSQL through Prisma. It stores the users.
- MessagePack: [`@msgpack/msgpack`]
- Thumbnails: FFmpeg (stretch goal)

## Running it locally

Requirements: Node [version], PostgreSQL, and FFmpeg (`ffmpeg -version` should work).

```
# backend
cd backend
npm install
cp .env.example .env              # fill in the values listed below
npx prisma migrate dev            # creates the tables
npx tsx prisma/seed.ts            # creates user1 and user2
mkdir -p storage/thumbnails
npm run dev

# frontend
cd [frontend-folder]
npm install
npm run dev
```

Environment variables: [PORT, DATABASE_URL, JWT_SECRET, CLIENT_ORIGIN, ...]. `DATABASE_URL` points at an empty PostgreSQL database you created, for example `postgresql://user:password@localhost:5432/configflow`.

Example msgpack files are in `backend/storage/msgpack/`, with the matching video in `backend/storage/videos/`. To regenerate the examples, run this from the `backend` folder:

```
npx tsx scripts/generate-examples.ts            # valid examples
npx tsx scripts/generate-examples.ts --invalid  # also writes broken files for testing error handling
```

The generated files cover an empty `slots` array, a `null` interaction, several slots with decimal values, and unicode text. All of them use the same video uuid, so the player works on each one.

## Test users

| Username | Password  |
| -------- | --------- |
| user1    | password1 |
| user2    | password2 |

Passwords are stored hashed ([bcrypt]). The seed script creates both users, and can be run again safely.

## Project structure

```
backend/
  prisma/
    schema.prisma          User model
    seed.ts                creates user1 and user2
    migrations/            database migrations
  scripts/
    generate-examples.ts   writes example .msgpack files into storage/msgpack
  src/
    server.ts              starts the HTTP server
    app.ts                 Express app, middleware and route wiring
    routes/                URL to controller mapping (auth, config)
    controllers/           request handling (auth, config)
    middleware/            auth check, central error handler
    validators/            request validation (auth, config)
    utils/                 msgpack/config helpers, JWT, password hashing
    types/                 shared types, Express request typing
    lib/prisma.ts          Prisma client instance
    generated/prisma/      generated Prisma client (not hand-edited)
  storage/
    msgpack/               config files
    videos/                videos, named <uuid>.mp4
    thumbnails/            generated thumbnails, named <uuid>.jpg (git-ignored)
frontend/
  [pages/ConfigDetail.tsx  the editor page]
  [lib/api.ts              axios instance]
```

Routes only map URLs to controllers, controllers handle the request and call the helpers in `utils/`, and the database is only touched through `lib/prisma.ts`. The frontend never touches files or the database directly.

## Assumption: the uuid is the video file name

The assignment says the `uuid` field identifies or references the video file, but it does not say how a uuid maps to a file. That is not specified anywhere in the task. The video file I used I named after its uuid (`a81f2c9e-4d71-4f20-9b31-8c42d7e5a610.mp4`), so I treated the uuid as the video's file name: a config with uuid `X` uses `storage/videos/X.mp4`.

Everything that touches the video is built on that one rule:

- the video route looks the file up by uuid,
- the FFmpeg thumbnail is generated from that file and cached as `storage/thumbnails/X.jpg`,
- the player in the editor loads the video by the saved uuid.

If a real deployment mapped uuids to files differently (another extension, a folder per video, or a database lookup), the only code that would change is the place that turns a uuid into a file path.

## How it works

**Login and sessions.** [Describe your choice, for example: JWT stored in an httpOnly cookie, with a `tokenVersion` on the user row so logout invalidates old tokens. Cookie-based auth means the browser sends credentials automatically with the `<video>` and poster requests, which a plain `<video src>` could not do with an Authorization header.] Every config, video and thumbnail route rejects unauthenticated requests.

**Where files live.** Config files and videos are stored on disk under `backend/storage/`, and the database only holds users. I chose disk because [the files are binary, small in number, and the video has to be streamed from disk anyway]. The `uuid` field in a config is what links it to its video, `storage/videos/<uuid>.mp4` (see the assumption above).

**Msgpack to UI.** `GET /config/:fileName` reads the file, decodes it, and returns the object. A corrupted or non-conforming file returns a friendly error instead of crashing the app. The page shows the top-level fields as a form, and each slot as its own card, with position as a group of four number fields and tags as a list of inputs. Slots can be collapsed to a one-line summary. `interaction` can be a string or `null`.

**UI to msgpack.** The page keeps the original data and the edited data. On save it compares them and sends a list of `{ path, value }` updates to `PATCH /config/:fileName`. The backend applies them, validates the result against the schema, encodes it back to MessagePack and writes the file. The saved data is returned and the page reloads its state from it.

**Validation.** The UI blocks saving when a slot has an empty or duplicate `id`, a non-numeric position value, a width or height of 0 or less, an empty tag, or no tags. `interaction` is either a non-empty string or `null`. [The backend validates the same rules in `validators/config.validator.ts`.]

**Video.** Each config is shown with an embedded video player, fed from `GET /config/video/:uuid`, which supports Range requests so seeking works. I chose a player over a static preview so the slots can be checked against real frames. Each slot is drawn as a numbered rectangle over the player. Slot coordinates are converted to percentages of the player size, so the overlay stays aligned at any size. The spec does not say which frame size the coordinates refer to, so I assumed **1280x720**. If the real reference size is different, it is one constant (`REFERENCE_FRAME`) in `ConfigDetail.tsx`.

## Stretch goals

**Diff view (done).** Clicking Save opens a "Review changes" dialog that lists every change as before and after, and the file is only written after confirming. Slots are matched by `id`, so added and removed slots are labeled as such.

**Video preview generation with FFmpeg (done).** `GET /config/thumbs/:uuid` grabs one frame from the video with FFmpeg the first time it is requested, saves it to `storage/thumbnails/<uuid>.jpg`, and serves that file. Later requests read the cached image, so FFmpeg runs once per video. The image is used as the player's `poster`. The uuid is validated before building any path, and FFmpeg is called with an argument array, not a shell string.

**Per-user access (not done).** See below.

## Limitations and what I would do next

- **Per-user access.** The msgpack schema has no owner field, so ownership has to live outside the file. I would add a `File` model in Prisma with an `ownerId` pointing to the user, check it in the GET and PATCH config controllers and return 403 for other users, and filter the file list to what the user is allowed to see.
- **uuid to file mapping.** The uuid-is-the-file-name rule is my own assumption, since the assignment does not define it. Videos with a different extension or a different layout would need the path lookup changed.
- **Diff matching by id.** Renaming a slot's `id` shows up as one removed and one added slot. Changing only the order of slots is not shown in the diff.
- **Assumed reference frame.** The 1280x720 assumption for slot coordinates should be confirmed, or the frame size added to the config.
- **Duration display.** The page shows the `length` value from the config. It does not read the real duration from the video file, so the two can differ.
- **No concurrent edit protection.** If two users edit the same file, the last save wins. A version check on save would fix that.
- **Tests.** I tested the round trip by hand, including empty `slots` and `null` interactions. Automated tests for the msgpack encode/decode and the update-applying logic would be the first thing I add.