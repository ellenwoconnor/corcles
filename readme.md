# Corcles README

AI wrote this code, don't blame me

## Downloads

### Install dependencies for dev environment

```
npm install dotenv drizzle-orm pg
```

then run
`npm install`

### Set up .env

Create environmental variables in .env 
```
DATABASE_URL="postgres://user:password@localhost:5432/corcles"
ENVIRONMENT="development"
```

You need to add values for: 
DO_SPACES_KEY (for image uploading)
DO_SPACES_SECRET (for image uploading)
DO_SPACES_BUCKET (for image uploading)
DO_SPACES_ENDPOINT (for image uploading)
GOOGLE_CLIENT_ID (for Google oAuth)
RESEND_API_KEY (for sending invitations)

### Prep Docker

Install docker and docker conmpose CLI as needed

brew install --cask docker
brew install docker-compose

Dockerfile sets the environment to production. To run in dev, change it to development. 

To build images: 
docker-compose build --no-cache

Start containers: 
docker-compose up -d

You should be able to access the app at localhost:3000

Other handy docker commands: 

Stop and remove all containers
docker stop $(docker ps -aq)
docker rm $(docker ps -aq)
docker rmi $(docker images -q)

Check running containers: 
docker ps

View logs
docker logs [container] --follow 

## Deploying to Fly.io

First authenticate with fly.io: 
fly auth docker-login

Tag the image and push it to Flyio registry
docker tag corcles-app registry.fly.io/corcles:latest
docker push registry.fly.io/corcles:latest 

Then deploy
fly deploy

### To run a local database

Uncomment the local database creation in docker-compose.yml. This will spin up a postgres container. Make sure the database url and parameters in .env are set correctly. 

Run the initial migration which will create all the tables:

```
NODE_ENV=development npm run dev
```

The migrations will automatically run on startup and create all the necessary tables in your local database. 