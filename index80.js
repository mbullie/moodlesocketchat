
var server = require('http').createServer();
var io = require('socket.io')(server);

clients = {};

server.listen(process.env.PORT || 80, function(){
  console.log('listening on *:' + server.address().port);
});

io.on('connection', function(client) {
	// server is connected
    console.log('Client is connected '+client.id);

	////////////////////////////

	// on error
	client.on('error', function(err) {
		console.log("socket Error: " + err);
	});


	client.on('disconnect', function(){
		// delete client id
		delete clients[client.id];
        console.log('client has disconnected '+client.id);
    });


	////////////////////////////

	client.on('updateUser', function(data) {
		console.log('updateUser Triggered '+data.userid);
		clients[client.id] = data.userid;
    });

	client.on('joinRoom',function(roomId){
		client.join(roomId);
	});


	////////////////////////////
	// Push notifications to specific users of this course, if online.
	////////////////////////////
	client.on('requestPost', function(data)	{
		handleRequest(data,function(socketId,data){
			//send to data client
			io.to(socketId).emit('pushNotifDiscussion' ,data.notification);
			if (isInRoom(socketId,"HpRoom"))
				io.to(socketId).emit('pushPostOnHp' ,{'discussionId':data.discussionId,'html':data.html});
		});
	});

	client.on('requestDiscussion', function(data) {
		handleRequest(data,function(socketId,data){
			io.to(socketId).emit('pushNotifDiscussion' ,data.notification);
			if (isInRoom(socketId,"HpRoom"))
				io.to(socketId).emit('pushHpDiscussion' ,{'discussionId':data.discussionId, 'html':data.html});
		});
    });



	////////////////////////////
	// Push content to course### room.
	// emit data to users who are in the course's room (ie. are with that specific course open in their browser, right now)
	////////////////////////////
	client.on('pushCoursePost', function(data) {
		data = _parse(data); if (!data) return;
		//console.log('pushCoursePost Triggered for course: ' + data.courseId);
		io.to( 'course' + data.courseId ).emit( 'pushCoursePost', data ); 	// NOTE: room will be created if it doesn't exist
	});

	client.on('pushCourseDiscussion', function(data) {
		data = _parse(data); if (!data) return;
		//console.log('pushCourseDiscussion Triggered for course: ' + data.courseId);
		io.to( 'course' + data.courseId ).emit( 'pushCourseDiscussion', data ); 	// NOTE: room will be created if it doesn't exist
	});

	////////////////////////////

});

/**
 * Check if a user is in a room.  Hack socket.io
 * @param  {string}  socketId user's socket id
 * @param  {string}  roomId   Room name
 * @return {Boolean}          Is he in the room?
 */
function isInRoom(socketId,roomId){
	var rooms = io.sockets.connected[socketId].rooms;
	return (typeof rooms[roomId] !== 'undefined');
}

/**
 * Parse input and validate JSON
 * @param  {string|json} data json or stringify'd
 * @return {json|boolean}
 */
function _parse(data){
	// Parse data as JSON
	try {
		if (typeof data !== 'object') 			data = JSON.parse(data);
		data.students = data.students.split(',');	// split the IDs csv
		return data;
	}
	catch (e) { console.log(e); return false; }
}

/**
 * Request handler,  match specific users, and exclude self.
 * @param  {[type]}   data     Json data
 * @param  {Function} callback Notification emitter callback
 */
function handleRequest(data, callback){

	data = _parse(data);
	if (!data) return;

	// loop students
	for (var i = 0, len = data.students.length; i < len; i++) {
		for (var socketId in clients)
		{
			// check if match -and- If client is the author, skip this notification (no need to self-notify)
			var clientId = clients[socketId];
			if( clientId == data.students[i]   &&  clientId !== data.userid)
				callback(socketId,data);
		}
	}
}
