---
sidebar_position: 2
---

# Installation

There are multiple ways to install and run Cromwell CMS

## 1. Docker run

The most simple way to deploy the CMS is to run it inside a Docker container. Our image goes with already installed MariaDB and Nginx (to proxy multiple services of the CMS), so you only need to install Docker.
[You can install Docker on Windows, Linux, or another supported platform](https://docs.docker.com/engine/install/)

After installation run a single command in your terminal / command prompt to create and run a container:

```sh
docker run -d -p 80:80 --name my-website cromwellcms/cromwell-mariadb:latest
```

Open http://127.0.0.1/ if you installed locally or your web-server IP address in a web browser. For the first time system needs to run some configuration scripts, so it will be up and running under one minute.  
Open http://127.0.0.1/admin to see the admin panel.

Note that you can use `localhost:port` only in development, for production or local docker container open `127.0.0.1:port`.

Stop the container:

```
docker stop my-website
```

Run again:

```
docker start my-website
```

## 2. Docker compose

For more granular control you can configure a docker-compose file. For this scenario, we have another image that contains CMS and Nginx, without database.

Create a new directory and place [docker-compose.yml](https://docs.docker.com/compose/) file with the following content:

```yml title="docker-compose.yml"
version: '3'
services:
  db:
    image: mariadb:latest
    container_name: mariadb_container
    volumes:
      - ./db_data:/var/lib/mysql
    ports:
      - 3306:3306
    restart: unless-stopped
    environment:
      MYSQL_ROOT_PASSWORD: root_password
      MYSQL_DATABASE: cromwell
      MYSQL_USER: cromwell
      MYSQL_PASSWORD: my_password

  phpmyadmin:
    depends_on:
      - db
    image: phpmyadmin/phpmyadmin
    container_name: phpadmin_container
    environment:
      PMA_HOST: db
    links:
      - db:db
    ports:
      - 8081:80
    restart: unless-stopped

  cromwell:
    image: cromwellcms/cromwell:latest
    container_name: cromwell_container
    depends_on:
      - db
    volumes:
      - ./nginx:/app/nginx
      - ./public:/app/public
      - ./.cromwell/server:/app/.cromwell/server
      - ./.cromwell/logs:/app/.cromwell/logs
    ports:
      - 80:80
    restart: unless-stopped
    environment:
      DB_TYPE: mariadb
      DB_HOST: db
      DB_PORT: 3306
      DB_DATABASE: cromwell
      DB_USER: cromwell
      DB_PASSWORD: my_password
```

Apart from Cromwell CMS the file configures MariaDB and phpMyAdmin to run in separate containers (you can remove phpMyAdmin if you don't need it).  
Another key feature is that it has volumes, so all data will be stored in your current directory, outside of Docker containers. You will be able to remove containers and keep DB data.

Replace password in environment variables: MYSQL_ROOT_PASSWORD, MYSQL_PASSWORD, DB_PASSWORD.  
MYSQL_PASSWORD and DB_PASSWORD must have the same value

Start all services:

```sh
cd /path/to/your/dir
docker-compose up -d
```

Open http://127.0.0.1/ in a web browser to see your website.  
Open http://127.0.0.1/admin to see the admin panel.  
Open http://127.0.0.1:8081 to see phpMyAdmin.

#### Working directories

As you can see in your current directory appeared new files:

- `db_data` - To store MariaDB Database.
- `public` - For public content such as images and other files uploaded via file manager.
- `.cromwell/logs` - CMS logs.
- `.cromwell/server/emails` - CMS e-mailing templates.
- `nginx` - Nginx settings.

For example, if you want to change emailing template that sends to your customers when they place a new order in your store you can modify file at `.cromwell/server/emails/order.hbs`

If you want to edit Nginx settings such as https configuration, you need to edit `nginx/nginx.conf` and restart the container with CMS.

## 3. Cromwell CLI

Cromwell CMS provides CLI that can create a new Node.js project.

- Download and install latest Node.js **v14 or 16** from https://nodejs.org/en/
- Install Python
- Install node-gyp: `npm install node-gyp -g`

Navigate to a directory where you want to create a new project subdirectory and run:

```sh
npx @cromwell/cli create my-website-name
```

Run the CMS:

```sh
cd my-website-name
npx cromwell start -d
```

Open [`http://localhost:4016`](http://localhost:4016) in a web browser to see your web site.  
Open [`http://localhost:4016/admin`](http://localhost:4016/admin) to see the admin panel.

#### Working directories

CMS will create the same working directories as in Docker compose example except `db_data` and `nginx`.

In this example, we do not launch a proxy server (Nginx) or a database service, but Cromwell CMS can work without them as well as without any config.  
The CMS has its Node.js proxy to distribute traffic to API server, Next.js server and admin panel.

And if there's no config provided CMS will create and use a new SQLite database in `./.cromwell/server/db.sqlite3`

:::note
It's recommended to use SQLite only in development. For production, you have to switch to MySQL/MariaDB/PostgreSQL. Read in the [next post](/docs/overview/configuration) how to setup a database.  
:::

## 4. NPM

Since the CMS is a set of packages, you can install them via npm.

- Download and install latest Node.js **v14 or 16** from https://nodejs.org/en/
- Install Python
- Install node-gyp: `npm install node-gyp -g`

Create a new directory and open terminal/command prompt

```sh
cd /path/to/your/dir
```

Run init command to create a new project:

```sh
npm init
```

Install the CMS:

```sh
yarn add @cromwell/cms --exact
```

You also can specify what themes and plugins your want to use. Usually we install the following by default (but you also will be able to install them later in the admin panel):

```sh
yarn add @cromwell/theme-store @cromwell/theme-blog @cromwell/plugin-main-menu @cromwell/plugin-newsletter @cromwell/plugin-product-filter @cromwell/plugin-product-showcase @cromwell/plugin-stripe --exact
```

Run the CMS:

```sh
npx cromwell start -d
```
