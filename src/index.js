const path = require('path')
const http = require('http')
const express = require('express')
const socketio = require('socket.io')
const { generateMessage, generateLocationMessage } = require('./utils/messages')
const { addUser, removeUser, getUser, getUsersInRoom } = require('./utils/users')

const app = express()
const server = http.createServer(app)
const io = socketio(server)

const port = process.env.PORT || 3000
const publicDirectoryPath = path.join(__dirname, '../public')


app.use(express.static(publicDirectoryPath))

// connection：使用者連線監聽，為保留事件。
// disconnect：使用者斷開連線，為保留事件。

// 在有新的client連入的時候，就會執行到connection的callback function，
// 會傳入一個socket，可以利用這個socket跟這個client溝通
io.on('connection', (socket) => {
    console.log('New WebSocker connection')

    // 而socket.on就是新增一個監聽事件，就像jQuery的$('#btn').on('click',function(...))那樣
    // 在上面的程式碼中，我們新增了一個事件，等待client端觸發。
    // 而這個事件是有新使用者連進來的時候，會傳入它的username，在這邊把這個資訊附加在socket上面，識別這個使用者。

    socket.on('join', (options, callback) => {
        console.log(options)
        const { error, user } = addUser({ id: socket.id, ...options })

        if (error) {
            return callback(error)
        }

        socket.join(user.room)

        socket.emit('message', generateMessage('Admin', 'Welcome!'))
        socket.broadcast.to(user.room).emit('message', generateMessage('Admin', `${user.username} has joined!`))
        // 而io.emit就是送出資料給所有連線的client，add user則是事件名稱，第二個參數是要送出的資料
        io.to(user.room).emit('roomData', {
            room: user.room,
            users: getUsersInRoom(user.room)
        })
        callback()
    })
    // 反正簡單來說就是
    // 要發送事件用socket.emit或是io.emit(server端)，要接收事件用socket.on，就是這麼簡單
    // 你只要自己定義一些事件名稱跟寫收到事件後要執行的code即可

    socket.on('sendMessage', (message, callback) => {
        const user = getUser(socket.id)
        console.log('sendmessage')
        io.to(user.room).emit('message', generateMessage(user.username, message))
        callback()
    })

    socket.on('sendLocation', (coords, callback) => {
        const user = getUser(socket.id)
        io.to(user.room).emit('locationMessage', generateLocationMessage(user.username, `https://google.com/maps?q=${coords.latitude},${coords.longitude}`))
        callback()
    })

    socket.on('disconnect', () => {
        const user = removeUser(socket.id)

        if (user) {
            io.to(user.room).emit('message', generateMessage('Admin', `${user.username} has left!`))
            io.to(user.room).emit('roomData', {
                room: user.room,
                users: getUsersInRoom(user.room)
            })
        }
    })
})

server.listen(port, () => {
    console.log(`server is up on port ${port}!`)
})