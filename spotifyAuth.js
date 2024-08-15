import axios from 'axios';
import qs from 'qs';

const client_id = 'bf79ea0130344f8192ac87a10a888f0d';
const client_secret = 'd0e86bfb16544c69850fc283dc84149f';
const redirect_uri = 'http://localhost:8001/callback';

export const getSpotifyToken = async (code) => {
  const token_url = 'https://accounts.spotify.com/api/token';

  const authOptions = {
    method: 'post',
    url: token_url,
    data: qs.stringify({
      code: code,
      redirect_uri: redirect_uri,
      grant_type: 'authorization_code'
    }),
    headers: {
      'Authorization': 'Basic ' + Buffer.from(client_id + ':' + client_secret).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  };

  const response = await axios(authOptions);
  return response.data;
};

export const getUserProfile = async (accessToken) => {
  const response = await axios.get('https://api.spotify.com/v1/me', {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });
  return response.data;
};
