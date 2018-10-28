var songDB = [];

function init() {
  var lochash = window.location.hash;
  if (lochash) {
    var regex = /access_token=(.*?)&/
    var match = regex.exec(lochash);
    var spotifyToken = match[1];

    if (spotifyToken) {
      console.log("spotifyToken: " + spotifyToken);
      loadSpotifyTracks(spotifyToken);
    } else alert("Spotify-Token is invalid!");

  } else {
    document.getElementById("app").innerHTML = '<h1>Spotify Lyrics Suche</h1><a href="https://accounts.spotify.com/authorize?client_id=2b1e732326ad41ca8c6755e0ab8c2176&response_type=token&redirect_uri=https://apps.nicolaiweitkemper.de/Spotify-Lyrics-Search/&scope=user-read-recently-played user-library-read user-top-read">Spotify verbinden</a>'
  }
}

function readyForSearch() {
  document.getElementById("app").innerHTML = '<input id="query" /><button onclick="doSearch()">Suchen</button>';
}

function loadSpotifyTracks(spotifyToken, nextUrl = 'https://api.spotify.com/v1/me/tracks') {
  document.getElementById("app").innerHTML = '<h3>Loading songs...</h3><progress id="spotify-progress" value="0" max="100"></progress>'; //<ul id="song-list"></ul>
  axios.get(nextUrl, {
      headers: {
        'Authorization': 'Bearer ' + spotifyToken
      }
    })
    .then(result => {
      var data = result.data;
      for (var obj of data.items) {
        //console.log("---------------------------");
        //console.log(obj.track.name);
        //var isrc = obj.track.external_ids.isrc;
        songDB.push(obj.track);
        //document.getElementById("song-list").innerHTML += '<li>' + obj.song.name + '</li>'
      }
      //oder songDB.concat(data.items)!

      if (data.next !== null) {
        loadSpotifyTracks(spotifyToken, data.next);
        document.getElementById("spotify-progress").max = data.total;
        document.getElementById("spotify-progress").value = data.offset;
      } else {
        loadAllLyrics();
      }

    })
    .catch(e => console.log(e));
}

function loadAllLyrics() {
  document.getElementById("app").innerHTML = '<h3>Loading lyrics...</h3><progress id="lyrics-progress" value="0" max="' + songDB.length + '"></progress>';
  for (var song of songDB) {
    loadLyricsFromOwnServer(song);
  }
}

function loadLyricsFromOwnServer(song) {
  if (!song.external_ids || !song.external_ids.isrc) {
    document.getElementById("lyrics-progress").value++;
    console.log(song.name + " has no ISRC!");
    return;
  }
  var isrc = song.external_ids.isrc;
  axios.get('https://apps.nicolaiweitkemper.de/Spotify-Lyrics-Search/get-lyrics.php', {
      params: {
        isrc
      }
    })
    .then(result => {
      song.lyrics = result.data;

      document.getElementById("lyrics-progress").value++;
      if (document.getElementById("lyrics-progress").value >= document.getElementById("lyrics-progress").max) readyForSearch();
    })
    .catch(e => {
      document.getElementById("lyrics-progress").value++;
      console.log(e);
    });
}

function doSearch() {
  var query = document.getElementById("query").value;
  if (query) {
    var options = {
      shouldSort: true,
      threshold: 0.3,
      location: 0,
      distance: 10000,
      //tokenize: true, //?
      maxPatternLength: 32,
      minMatchCharLength: 2,
      keys: [{
          name: 'lyrics',
          weight: 0.8
        },
        {
          name: 'name',
          weight: 0.2
        }
      ]
    };
    var fuse = new Fuse(songDB, options);
    var results = fuse.search(query);
    console.log(results);

    document.getElementById("app").innerHTML = '<input id="query" /><button onclick="doSearch()">Suchen</button><br><br><ul id="search-results"></ul>'
    for (var result of results) {
      var titleLink = '<a target="_blank" href="' + result.external_urls.spotify + '">' + result.name + '</a>';
      var artistLinks = result.artists.map(x => '<a target="_blank" href="' + x.external_urls.spotify + '">' + x.name + '</a>').join(" | ");
      document.getElementById("search-results").innerHTML += "<li>" + titleLink + " (" + artistLinks + ")" + "</li>";
    }
  }
}
