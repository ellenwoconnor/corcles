# Corcles README

AI wrote this code, don't blame me

How this bullshit works with DO
- if you have ca-certificate.crt locally, you can connect to the database
- the file won't exist in fly.io, so we need to create it 

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

You also need to locally define a variable to capture the value of the local
postgres db secret. This must be pulled in at build time in order to recreate the crt file in the continer.  

You also need to define the value for BUILDKIT for that to work. 
```sh
export PG_CA_CERT="$(cat ca-certificate.crt)" 
export DOCKER_BUILDKIT=1
```

TODO: Modify Dockerfile to allow local runs to access ca-certificate.crt directly instead of via PG_CA_CERT

### Prep Docker

Install docker and docker conmpose CLI as needed

brew install --cask docker
brew install docker-compose

Dockerfile sets the environment to production. To run in dev, change it to development. 

To build images -- this passes in the value of the crt and logs detailed output: 
```sh
PG_CA_CERT=$PG_CA_CERT docker-compose build --no-cache --progress=plain  
```

or alternatively this one which lets you pass platform for deployment
```sh
docker build --no-cache --build-arg PG_CA_CERT=$PG_CA_CERT -t corcles-app:latest . --platform linux/amd64                                  
```

Start containers and run the app: 
```sh
docker-compose up -d
```

You should be able to access the app at localhost:3000

Other handy docker commands: 

Prune all the old stuff: 
```sh
docker system prune -a 
```
Check running containers: 
```sh
docker ps
```

Debug:
```sh
docker logs [container] --follow
docker exec -it [container] sh
```

## Deploying to Fly.io

First authenticate with fly.io: 
```sh
fly auth docker
```

Create an image with the right a

```sh
docker build --no-cache --build-arg PG_CA_CERT=$PG_CA_CERT -t corcles-app:latest . --platform linux/amd64
```


Tag the image and push it to Flyio registry
```sh
docker tag corcles-app registry.fly.io/corcles:latest
docker push registry.fly.io/corcles:latest 
```

Then deploy (BUILDKIT is required for build time secrets)
```sh
DOCKER_BUILDKIT=1 flyctl deploy
```

Other useful commands
```sh
fly ssh console -a corcles
```

### To run a local database

Uncomment the local database creation in docker-compose.yml. This will spin up a postgres container. Make sure the database url and parameters in .env are correct. 

The migrations will automatically run on startup and create all the necessary tables in your local database. 

fly ssh console
ls -l /app/ca-certificate.crt
