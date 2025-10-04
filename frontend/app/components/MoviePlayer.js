'use client'
import { useRef, useEffect, useState } from 'react';
import 'plyr/dist/plyr.css';

// Helper to extract YouTube video ID from a URL
function getYouTubeVideoId(url) {
    const regExp = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/ ]{11})/;
    const match = url.match(regExp);
    return match ? match[1] : url;
}
function setMovieTrailerId(id) {
    setSearchValue("");
    setSearchResults([]);
    // fetch trailer for movie id
    fetch(`https://localhost:9000/trailers/${id}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json;charset=utf-8'
        }
    })
        .then(response => response.json())
        .then(data => {
            console.log(data); // Handle the search results
            if (data && data.length > 0) {
                const trailer = data.find(video => video.type === 'Trailer' && video.site === 'YouTube');
                if (trailer) {
                    setSelectedMovie(trailer.key);
                } else {
                    alert('No trailer found for this movie.');
                }
            }
        })
        .catch(error => {
            console.error('Error fetching trailer:', error);
        });
}
function MoviePlayer({ videoUrl }) {
    const playerContainer = useRef(null);
    const playerInstance = useRef(null);
    const [videoId, setVideoId] = useState();

    useEffect(() => {
        let player;
        async function initPlyr() {
            const Plyr = (await import('plyr')).default;
            player = new Plyr(playerContainer.current, {
                autoplay: true,
                youtube: {
                    modestbranding: 1,
                    rel: 0,
                },
            });
            playerInstance.current = player;
        }

        initPlyr();

        return () => {
            player.destroy();
        };
    }, []);

    useEffect(() => {
        console.log("Video URL changed:", videoUrl);
        const id = getYouTubeVideoId(videoUrl);
        setVideoId(id);
        if (playerInstance.current)
            playerInstance.current.source = {
                type: 'video',
                title: 'New video title',
                sources: [
                    {
                        src: id,
                        provider: 'youtube',
                    },
                ],
            };
    }, [videoUrl]);

    // Style wrapper enforcing a 21:9 aspect ratio using the CSS aspect-ratio property.
    // Note: This property works on modern browsers.
    const aspectRatioStyle = {
        width: '100%',
        aspectRatio: '21 / 9',
        position: 'relative',
    };

    return (
        <div style={aspectRatioStyle}>
            <div className="flicker-animation" style={{ width: '100%', height: '100%' }}>
                <div
                    ref={playerContainer}
                    data-plyr-provider="youtube"
                    data-plyr-embed-id={videoId}
                    style={{ width: '100%', height: '100%' }}
                >
                </div>
            </div>
        </div>
    );
}

export default MoviePlayer;