# Corcles README

AI wrote this code, don't blame me

## Downloads

### Set up postgres

Install PostgreSQL from https://www.postgresql.org/download/

Create a new database:

```
createdb corcles
```

start postgres with `brew services start postgresql`

Then get the postgres user, password, and port and add the DATABASE_URL to .env

Note: I had to fiddle a lot to get the right username and password using PSQL with: 

```
Find postgres
sudo lsof -iTCP -sTCP:LISTEN | grep postgres

Get user and port for postgres instance
sudo lsof -i :5432
```

Install pge 

### Install dependencies for dev environment

```
npm install dotenv drizzle-orm pg
```

Then run
`npm install`

### Set up .env

Create environmental variables in .env 
```
DATABASE_URL="postgres://user:password@localhost:5432/corcles"
ENVIRONMENT="development"
```

You need to add values for: 
WS_PORT
DO_SPACES_KEY (for image uploading)
DO_SPACES_SECRET (for image uploading)
DO_SPACES_BUCKET (for image uploading)
DO_SPACES_ENDPOINT (for image uploading)
GOOGLE_CLIENT_ID (for Google oAuth)
RESEND_API_KEY (for sending invitations)

Configure local database connection and validate it works with `node test-db.js`

Then Update the DATABASE_URL in your code to point to your local database:
server/db.ts

Run the initial migration which will create all the tables:

```
NODE_ENV=development npm run dev
```

The migrations will automatically run on startup and create all the necessary tables in your local database.

You can then connect to your database using the psql command line tool:

```
psql corcles
```

The schema and migrations are already defined in your codebase through server/db-dev.ts and will be automatically applied.

The app is accessed on `localhost:5000`

### Install Docker

Install docker and docker conmpose CLI

brew install --cask docker
brew install docker-compose

To build images: 
docker-compose build --no-cache

Start containers: 
docker-compose up -d

You should be able to access the app at localhost:3000




You should see both your app and db containers running.

To 
docker tag corcles-app "registry.digitalocean.com/corclesregistry/corcles-app"
docker push registry.digitalocean.com/corclesregistry/corcles-app 

Other handy commands: 

Stop and remove all containers

docker stop $(docker ps -aq)
docker rm $(docker ps -aq)
docker rmi $(docker images -q)

Check running containers: 
docker ps
