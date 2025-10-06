# Movie Connections 🎬
_Visualize relationships between films using TMDB data and D3.js._

![Build](https://img.shields.io/github/actions/workflow/status/andrewb/movie-connections/ci.yml)
![License](https://img.shields.io/github/license/andrewb/movie-connections)
![Issues](https://img.shields.io/github/issues/andrewb/movie-connections)

## Overview
Movie Connections is an interactive web app that visualizes relationships between movies 
using data from the TMDB API. Built with Next.js, D3.js, and Docker for deployment.

## Demo
![Demo](docs/demo.gif)

👉 [Live Demo](https://movieconnections.andrewb.site)

## Tech Stack
- **Frontend:** Next.js, React, D3.js
- **Backend:** Next.js, Node.js, Express
- **Infrastructure:** Docker, Cloudflare Tunnel

## Installation

## Installation

```bash
git clone https://github.com/andrewb/movie-connections.git
cd movie-connections
docker-compose up --build
```
Then open http://localhost:3000

## Configuration
Create a `.env` file in the root directory:
.env
```TMDB_API_KEY=your_api_key_here```

## Contributing
Pull requests are welcome. For major changes, please open an issue first 
to discuss what you would like to change.

## License
MIT © 2025 Andrew Brown

## Author
**Andrew Brown**  
[GitHub](https://github.com/andrewbrowbconsulting) | [LinkedIn](https://www.linkedin.com/in/andrew-brown-b50592183/)




