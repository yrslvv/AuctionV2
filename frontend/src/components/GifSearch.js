import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './GifSearch.css';

const GifSearch = ({ onGifSelect }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [gifs, setGifs] = useState([]);

  // Debounce function to limit API calls
  const debounce = (func, delay) => {
    let debounceTimer;
    return function(...args) {
      const context = this;
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => func.apply(context, args), delay);
    };
  };

  useEffect(() => {
    // Placeholder effect that is currently unused
  }, []);

  const fetchGifs = async (query) => {
    if (!query) return;
    try {
      const searchUrl = `https://tenor.googleapis.com/v2/search?q=${query}&key=AIzaSyCfPz-AXvOA8cnneQlgqNTJPgpyvSNF-1w&client_key=my_test_app&limit=8`;
      const response = await axios.get(searchUrl);
      setGifs(response.data.results);
    } catch (error) {
      console.error('Error fetching GIFs:', error);
    }
  };

  // Debounced version of fetchGifs
  const debouncedFetchGifs = debounce(fetchGifs, 500);

  const handleSearch = (e) => {
    const query = e.target.value;
    setSearchTerm(query);
    debouncedFetchGifs(query);
  };

  return (
    <div className="gif-search-container">
      <input
        type="text"
        value={searchTerm}
        onChange={handleSearch}
        placeholder="Search GIFs"
      />
      <div className="gif-results">
        {gifs.map((gif) => (
          <img
            key={gif.id}
            src={gif.media_formats.nanogif.url}
            alt={gif.content_description}
            onClick={() => onGifSelect(gif.media_formats.gif.url)}
            className="gif-item"
          />
        ))}
      </div>
    </div>
  );
};

export default GifSearch;
