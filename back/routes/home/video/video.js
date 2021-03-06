const express = require('express');
const router = express.Router();
const fs = require('fs');
var torrentStream = require('torrent-stream');
const parseRange = require('range-parser');
const ffmpeg = require('fluent-ffmpeg');
var mongo = require('../../../mongo');
const mongodb = mongo.getMongodb();
const rimraf = require('rimraf');
const ngrok = require('ngrok');
var Timer = require('easytimer')
const ngrokConnect = ngrok.connect(3001)

var url;

ngrokConnect.then(data => {
	url = data;
});

var user = {};
var ext;


router.get('/:canal/:movieId/:magnet/:time', function(req, res, next) {

	var timer = new Timer();
	timer.start();
	if (req.session && req.session._id) {

		const id = req.session._id.toString()
		const { magnet, time, canal, movieId } = req.params

		if (time.slice(time.length - 5, time.length) == 'first') {
			const db = mongo.getDb();
			const magnetsCollection = db.collection('magnets');
			const usersCollection = db.collection('users');

			if (magnet.match(/^magnet:\?xt=urn:/i) != null) {

				magnetsCollection.findOne({magnet: magnet}, function(err, result) {
					if (result && ((result.downloaded && result.endDL) || (result.downloaded && Date.now() - result.dateProgress < 1000 * 60 * 2))) {
						if (result.path) {
							var m3u8name;

							magnetsCollection.update({magnet: magnet}, {$set: {date: Date.now()}});

							if (result.path.substr(result.path.length - 5
								) === ".m3u8") {
								m3u8name = result.path
							} else {
								m3u8name = (result.path + ".m3u8").replace(/\s/g, "_");
							}

							res.status(201).json({url: url + '/movies/' + m3u8name + '/' + m3u8name})
						} else {
							res.sendStatus(300)
						}
					} else {
						var engine = torrentStream(magnet, {path: './public/movies'})
						var response = false

						setTimeout(() => {
							if (!response) {
								response = true;
								res.status(300).json({message: 'Not enough seeders or slow internet connection! Streaming impossible..'});
							}
						}, 115000)
						engine.on('ready', function() {
							
							var time = timer.getTimeValues().seconds + 60 * timer.getTimeValues().minutes

							var size = 0
							var file;

							engine.files.forEach(function(fileTmp, key) {
								if (key === 0) {
									var path;
									const paths = fileTmp.path.split('/');

									if (fileTmp.name.substr(fileTmp.name.length - 4) === '.mkv') {
										path = paths[0].replace(".mkv", ".m3u8").replace(/\s/g, "_")
									} else if (fileTmp.name.substr(fileTmp.name.length - 4) === '.avi') {
										path = paths[0].replace(".avi", ".m3u8").replace(/\s/g, "_")
									} else {
										path = (paths[0] + ".m3u8").replace(/\s/g, "_");
									}

									magnetsCollection.update(
										{magnet: magnet},
										{$set: 
											{date: Date.now(), path: path}
										},
										{upsert: true}
									);

									usersCollection.update(
										{_id: new mongodb.ObjectId(req.session._id)},
										{$addToSet:
											{"seenMovies": {canal: canal, movieId: movieId}}
										},
										{upsert: true}
									)
								}

								if (fileTmp.length > size) {
									size = fileTmp.length
									file = fileTmp;
									ext = file.name.substr(file.name.length - 3);			
								}
							})

							user[id] = file;
							if (!response) {
								response =  true
								if (ext === 'mp4' || ext === 'webm') {
									res.status(201).json({url: null});
								} else if (ext === 'mkv' || ext === 'avi') {
									download_transcript(user[id], req, res, time);
								} else {
									res.status(300).json({message: 'Unhandled video content!'});
								}
							}
						})
					}
				})
			} else {
				res.status(300).json({message: 'Incorrect magnet link!'});
			}
		} else {
			if (ext === 'mp4' || ext === 'webm') {
				download_no_transcript(user[id], req, res);
			}
		}
	} else {
		res.sendStatus(300);
	}
})

download_no_transcript = function(file, req, res) {	

	const range = req.headers.range
	var parts;
	
	if (typeof range == 'undefined') {
		parts = [0, file.length-1];
	} else {
		parts = range.replace(/bytes=/, "").split("-");
	}

	const start = parseInt(parts[0], 10) > file.length? 0 : parseInt(parts[0], 10);
	const end = parts[1] ? parseInt(parts[1], 10) : file.length - 1;

	var stream = file.createReadStream({start: start, end: end})

	res.setHeader('Content-Type', 'video/mp4')
	res.setHeader('Accept-Ranges', 'bytes');
	res.setHeader('Content-Length', 1 + end - start);
	res.setHeader('Content-Range', `bytes ${start}-${end}/${file.length}`);
	res.statusCode = 206;
	setTimeout(() => {
			stream.pipe(res)
	}, 15000)

}


download_transcript = function(file, req, res, time) {

	const paths = file.path.split('/');
	var sizetot= 0 
	var stream = file.createReadStream();
	stream.on('data', (data) => {
		sizetot += data.length
	})
	const db = mongo.getDb();
	const magnetsCollection = db.collection('magnets');
	const { magnet } = req.params
	var first = true;
	var minDL = true;
	var response = false
	var m3u8name

	if (paths[0].substr(paths[0].length - 4) === '.mkv') {
		m3u8name = paths[0].replace(".mkv", ".m3u8").replace(/\s/g, "_")
	} else if (paths[0].substr(paths[0].length - 4) === '.avi') {
		m3u8name = paths[0].replace(".avi", ".m3u8").replace(/\s/g, "_")
	} else {
		m3u8name = (paths[0] + ".m3u8").replace(/\s/g, "_");
	}

	const ngrokUrl = url + '/movies/' + m3u8name + '/' + m3u8name;

	setTimeout(() => {
		if (!response) {
			response = true;
			if (first) {
				res.status(300).json({message: 'Not enough seeders or slow internet connection! Streaming impossible..'});
			}
			else {
				res.status(201).json({url: ngrokUrl});
			}
		}
	}, 120000 - 5000 - time * 1000)

	ffmpeg(stream, { timeout: 432000 }).addOptions([
	    '-profile:v baseline',
	    '-level 3.0', 
	    '-s 1280x720',
	    '-start_number 0',
	    '-hls_time 2',
	    '-hls_list_size 0',
	    '-hls_playlist_type vod',
	    '-f hls'
	])
	.on('start', () => {
		console.log("Started transcripting!");

		magnetsCollection.update({magnet: magnet}, {$set: {downloaded: true}});

		if (!fs.existsSync('public/movies/' + m3u8name)) {
			fs.mkdirSync('public/movies/' + m3u8name);
		}
	})
	.on('error', function(err, err1, err2) {
    })
    .on('progress', function(progress) {

    	magnetsCollection.update({magnet: magnet}, {$set: {dateProgress: Date.now()}});
    	if (first && fs.existsSync('public/movies/' + m3u8name + '/' + m3u8name)) {
			
			first = false;
		}
		if (!first && minDL && sizetot > 15000000 && !response) {
			minDL = false
			response = true
			res.status(201).json({url: ngrokUrl});
		}
    })
	.output('public/movies/' + m3u8name + '/' + m3u8name)
	.on('end', () => {
		console.log('Transcripting done!');
		const path = file.path.split('/');

		magnetsCollection.update({magnet: magnet}, {$set: {endDL: true}});
		if (fs.existsSync('public/movies/' + file.name)) {
			rimraf('public/movies/' + path[0], function(err) {
			});
		}
	})
	.run()			
}

module.exports = router;

