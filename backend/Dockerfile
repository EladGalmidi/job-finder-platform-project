# Debian slim rather than Alpine.
#
# @napi-rs/canvas ships prebuilt binaries for both, but glibc is the better
# tested target and image size is not the constraint here — a failed native
# load at runtime costs far more than the extra tens of megabytes.
FROM node:22-bookworm-slim AS build

WORKDIR /app

# Dependencies are copied and installed before the source, so a source-only
# change reuses the cached install layer instead of resolving the tree again.
COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN npm run build


FROM node:22-bookworm-slim AS runtime

ENV NODE_ENV=production

WORKDIR /app

# Production dependencies only: the compiler, test runner and linter have no
# business in a running container, and every one of them is attack surface.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build /app/dist ./dist
# Migrations travel with the image so the deploy step runs exactly the SQL that
# was built and reviewed, not whatever happens to be on a branch.
COPY drizzle ./drizzle
COPY seed ./seed

# Runs unprivileged. The node image provides this user; a process that never
# needs root should never have it.
USER node

EXPOSE 3000

# No --env-file here: configuration comes from the platform's environment, and
# config/env.ts refuses to start if any of it is missing or malformed.
CMD ["node", "dist/main.js"]
