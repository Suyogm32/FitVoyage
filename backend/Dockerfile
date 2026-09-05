# syntax=docker/dockerfile:1

# ---- deps stage -----------------------------------------------------------
# Installs dependencies in their own layer, separate from your source code.
# Docker caches each instruction as a layer and only reruns a layer (and
# everything after it) when its inputs change. If we copied the whole repo
# and then ran `npm ci`, editing routes/coach.js would invalidate the
# dependency-install layer too, and every rebuild would reinstall from
# scratch. Copying only the lockfile first means `npm ci` only reruns when
# package.json/package-lock.json actually change.
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# `ci`, not `install`: installs exactly what the lockfile says, fails instead
# of silently updating it. `--omit=dev` skips nodemon/prettier/the AWS SDK —
# none of that belongs in the image that runs in production.
RUN npm ci --omit=dev

# ---- runtime stage ----------------------------------------------------------
# A second, clean stage. Only what's explicitly COPY'd from `deps` and from
# the build context makes it in — so nothing used only to build (there's
# nothing here yet, but this is the pattern you'd extend if a build step
# were ever added) leaks into what ships.
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Containers run as root by default. That's fine for `docker build`, not for
# what the process does once it's running — a bug that lets an attacker
# execute code in this container should not hand them root inside it.
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

# Documentation for anyone reading this file / `docker inspect`. Doesn't
# actually publish the port — that's `-p` on `docker run` or the host's
# service config.
EXPOSE 5000

CMD ["node", "server.js"]