import axios from 'axios';
import qs from 'qs';

const client_id = 'bf79ea0130344f8192ac87a10a888f0d';
const client_secret = 'd0e86bfb16544c69850fc283dc84149f';
const redirect_uri = 'http://localhost:8001/callback';

export const getSpotifyToken = async (code) => {
  const token_url = 'https://accounts.spotify.com/api/token';

  const data = qs.stringify({
    grant_type: 'authorization_code',
    code,
    redirect_uri,
    client_id,
    client_secret,
  });

  const headers = {
    'Content-Type': 'application/x-www-form-urlencoded',
  };

  try {
    const response = await axios.post(token_url, data, { headers });
    return response.data.access_token;
  } catch (error) {
    throw new Error(`Failed to fetch Spotify token: ${error.response.data.error_description}`);
  }
};
