export const formatMessage = (username, text) => {
  return {
    username,
    text,
    time: new Date().toLocaleTimeString(),
  };
}

const users = [];
const roomsChatHistory = {};

// Join user to chat
export const newUser = (id, username, room) => {
  const user = { id, username, room };

  users.push(user);

  return user;
}

export const addMessageToHistory = (room, message) => {
  if (!roomsChatHistory[room]) {
    roomsChatHistory[room] = [];
  }

  roomsChatHistory[room].push(message);
}

export const getChatHistory = (room) => {
  return roomsChatHistory[room];
}

// Get current user
export const getActiveUser = (id) => {
  return users.find(user => user.id === id);
}

// User leaves chat
export const exitRoom = (id) => {
  const index = users.findIndex(user => user.id === id);

  if (index !== -1) {
    return users.splice(index, 1)[0];
  }
}