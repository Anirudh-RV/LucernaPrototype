# LucernaPrototype

Prototype for Contract Management

# To Run Backend

## To start lucerna

> docker compose -f docker-compose/docker-compose-local.yml up --build

## To migrate DataBases

> docker exec -it docker-compose-lucerna-backend-1 bash
> python manage.py makemigrations

You should see a new file in the migrations folder

> python manage.py migrate

This applies those migration files

## To accesss DB

> docker exec -it docker-compose-lucerna-db-1 bash
> psql -U lucernauser -d lucernadb

## To create superuser

> docker exec -it docker-compose-lucerna-backend-1 bash
> python manage.py createsuperuser

Access the Admin Panel here

> http://localhost:8000/admin/login/?next=/admin/

# To Run Frontend

## Running frontend for dev (Use this for all developing purposes)

> cd LUCERNA-frontend

> npm i

> npm run dev

## For building the Frontend

> cd frontend

> npm install

> npm run build

## To run the server

> npx tsc
> `node dist/index.js`
