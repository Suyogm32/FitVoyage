import axios from "axios";
export const exerciseOptions = {
  method: "GET",
  headers: {
    "X-RapidAPI-Key": "65c9145d2fmshcb66c9c3e9f6558p19891ejsn6d4d03059956",
    "X-RapidAPI-Host": "exercisedb.p.rapidapi.com",
  },
};

export const fetchData = async (url, options) => {
  const resp = await axios.request(url, options);
  const data = await resp.data;
  return data;
};

export const youtubeVideoOptions = {
  method: "GET",
  params: { limit: "3" },
  headers: {
    "X-RapidAPI-Key": "9d169a9198msh601301cda3d4bd5p155b31jsn46a9c67789bf",
    "X-RapidAPI-Host": "youtube-search-and-download.p.rapidapi.com",
  },
};
