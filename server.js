const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Ensure directories exist
const dataDir = path.join(__dirname, 'data');
const uploadsDir = path.join(__dirname, 'public', 'uploads');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'setups.json');
const profilesPath = path.join(dataDir, 'profiles.json');

// Initialize database with sample setups if empty/missing
const sampleSetups = [
  {
    id: "sample-1",
    title: "Cyberpunk Battlestation 2077",
    username: "NeonGamer",
    description: "My custom built liquid-cooled gaming desk. Added custom neon purple backlighting, mechanical keyboard with lavender switches, and a 49-inch ultrawide monitor for deep immersion. Great for late-night gaming sessions.",
    category: "Gaming",
    image_url: "https://images.unsplash.com/photo-1603481588273-2f908a9a7a1b?auto=format&fit=crop&w=1200&q=80",
    likes: 42,
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
    comments: [
      {
        id: "c1",
        username: "KeycapCollector",
        text: "The neon purple looks incredible! What switches are you running?",
        created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        replies: [
          {
            id: "c2",
            username: "NeonGamer",
            text: "@KeycapCollector Thanks! Running Kailh Box V2 Lavender Tactiles. Super smooth.",
            created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000).toISOString()
          }
        ]
      }
    ]
  },
  {
    id: "sample-2",
    title: "Minimalist Oak & Warm Lights",
    username: "NordicDesign",
    description: "An oak wood desk setup focusing on simplicity and functionality. Wireless mouse, custom keychron keyboard, a single monitor arm, and warm lighting to reduce eye strain. Zero cable visibility.",
    category: "Minimal",
    image_url: "https://images.unsplash.com/photo-1585776245991-cf89dd7fc73a?auto=format&fit=crop&w=1200&q=80",
    likes: 89,
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
    comments: [
      {
        id: "c3",
        username: "CleanDeskClub",
        text: "This is peak minimalism. The wood tone is gorgeous.",
        created_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString()
      }
    ]
  },
  {
    id: "sample-3",
    title: "The Ultimate Coding Sanctuary",
    username: "CodeNinja",
    description: "Optimized for maximum IDE real estate. Running vertical dual monitors, custom Ergodox split keyboard, ergonomic office chair, and a desk shelf to hold utility items. Clean, productive, and focused.",
    category: "Coding",
    image_url: "https://images.unsplash.com/photo-1607799279861-4dd421887fb3?auto=format&fit=crop&w=1200&q=80",
    likes: 64,
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
    comments: []
  },
  {
    id: "sample-4",
    title: "Triple Screen Productivity Hub",
    username: "SoloFounder",
    description: "A productivity powerhouse. Built on a motorized sit-stand desk. Powering three 4K monitors from a MacBook Pro. Equipped with a high-fidelity microphone for webinars and podcasts.",
    category: "Productivity",
    image_url: "https://images.unsplash.com/photo-1547082299-de196ea013d6?auto=format&fit=crop&w=1200&q=80",
    likes: 27,
    created_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(), // 8 days ago
    comments: []
  },
  {
    id: "sample-5",
    title: "Clean Student Workspace",
    username: "StudyHarder",
    description: "Budget-friendly student desk setup in a small dorm room. Includes custom pegboard for organizing cables and headphones, iPad for note-taking, and warm desk mat. Proof that you don't need a huge budget for a clean look.",
    category: "Student",
    image_url: "https://images.unsplash.com/photo-1618477388954-7852f32655ec?auto=format&fit=crop&w=1200&q=80",
    likes: 15,
    created_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(), // 12 hours ago
    comments: []
  }
];

function getMockLikesList(setupId, baseCount) {
  const mockNames = ['NordicDesign', 'CodeNinja', 'SoloFounder', 'StudyHarder', 'RGBVibe', 'MechKeyboard', 'CableManager', 'BattlestationKing', 'NeonLight', 'PixelArtist', 'ErgoNerd', 'GamerPro', 'DeskSetupClub', 'MinimalistDev', 'LaptopGamer', 'WoodDeskFan', 'TripleMonitor', 'ErgonomicFan', 'CustomKeyboard', 'KeycapEnthusiast', 'WorkspaceGoal', 'CleanSetup', 'GameStation', 'CreativeDev', 'CodersLife', 'TechReviewer', 'SetupInspiration', 'CozyAttic', 'AtticVibe', 'DesignEnthusiast', 'MacBookProUser', 'LinearSwitch', 'TactileLover', 'RGBQueen', 'DeskFlexer', 'BattlestationShowcase', 'GamingRoom', 'DeveloperWorkspace', 'CozyNook', 'NeonLegend', 'NordicStyle', 'ErgonomicDream'];
  
  let seed = setupId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const list = [];
  
  for (let i = 0; i < baseCount; i++) {
    const nameIdx = (seed + i * 17) % mockNames.length;
    const number = (seed + i * 3) % 1000;
    let mockName = mockNames[nameIdx];
    if (i > mockNames.length / 2) {
      mockName = mockName + '_' + number;
    }
    if (!list.includes(mockName)) {
      list.push(mockName);
    }
  }
  return list;
}

function readDB() {
  try {
    if (!fs.existsSync(dbPath)) {
      const setupsWithLikes = sampleSetups.map(s => {
        if (!s.liked_by || s.liked_by.length === 0) {
          s.liked_by = getMockLikesList(s.id, s.likes || 0);
        }
        s.likes = s.liked_by.length;
        return s;
      });
      fs.writeFileSync(dbPath, JSON.stringify(setupsWithLikes, null, 2));
      return setupsWithLikes;
    }
    const data = fs.readFileSync(dbPath, 'utf8');
    const parsed = JSON.parse(data);
    
    // Ensure every setup has comments, likes, and liked_by property for backwards compatibility
    let updated = false;
    const mapped = parsed.map(setup => {
      if (!setup.comments) {
        setup.comments = [];
        updated = true;
      } else {
        setup.comments.forEach(comment => {
          if (!comment.replies) {
            comment.replies = [];
            updated = true;
          }
        });
      }
      if (setup.votes !== undefined) {
        setup.likes = setup.votes;
        delete setup.votes;
        updated = true;
      }
      if (setup.likes === undefined) {
        setup.likes = 0;
        updated = true;
      }
      // Preserve existing liked_by; do not generate mock followers for production data
      if (!Array.isArray(setup.liked_by)) {
        setup.liked_by = [];
        updated = true;
      }
      // Ensure likes count matches liked_by length
      setup.likes = setup.liked_by.length;
      updated = true;
      if (setup.private === undefined) {
        setup.private = false;
        updated = true;
      }
      return setup;
    });

    if (updated) {
      fs.writeFileSync(dbPath, JSON.stringify(mapped, null, 2));
    }
    
    return mapped;
  } catch (err) {
    console.error('Error reading DB:', err);
    return [];
  }
}

function writeDB(data) {
  try {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error writing DB:', err);
  }
}

function readProfiles() {
  try {
    if (!fs.existsSync(profilesPath)) {
      fs.writeFileSync(profilesPath, JSON.stringify({}, null, 2));
      return {};
    }
    const data = fs.readFileSync(profilesPath, 'utf8');
    const parsed = JSON.parse(data);
    
    const normalized = {};
    Object.keys(parsed).forEach(k => {
      normalized[k.toLowerCase()] = parsed[k];
    });
    return normalized;
  } catch (err) {
    console.error('Error reading profiles:', err);
    return {};
  }
}

function writeProfiles(data) {
  try {
    fs.writeFileSync(profilesPath, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error writing profiles:', err);
  }
}

// Set up express middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Configure Multer for File Uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  const ext = path.extname(file.originalname).toLowerCase();
  const allowedExts = ['.jpg', '.jpeg', '.png', '.webp'];

  if (allowedTypes.includes(file.mimetype) && allowedExts.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPG, PNG and WEBP are allowed.'));
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// --- API Endpoints ---

// Get setups list (with sorting)
app.get('/api/setups', (req, res) => {
  const setups = readDB();
  const sort = req.query.sort || 'newest';
  const category = req.query.category;
  const viewer = req.query.username;

  // Filter privacy
  let filteredSetups = setups.filter(s => {
    if (!s.private) return true;
    if (viewer && s.username.toLowerCase() === viewer.trim().toLowerCase()) return true;
    return false;
  });

  // Category filter if specified
  if (category && category !== 'All') {
    filteredSetups = filteredSetups.filter(s => s.category.toLowerCase() === category.toLowerCase());
  }

  // Sort
  if (sort === 'votes' || sort === 'likes') {
    filteredSetups.sort((a, b) => b.likes - a.likes);
  } else {
    // Default: newest first
    filteredSetups.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }

  res.json(filteredSetups);
});

// Get individual setup details
app.get('/api/setups/:id', (req, res) => {
  const setups = readDB();
  const setup = setups.find(s => s.id === req.params.id);
  if (!setup) {
    return res.status(404).json({ error: 'Setup not found.' });
  }

  // Privacy check
  const viewer = req.query.username;
  if (setup.private) {
    if (!viewer || setup.username.toLowerCase() !== viewer.trim().toLowerCase()) {
      return res.status(403).json({ error: 'This setup is private.' });
    }
  }

  res.json(setup);
});

// Add new setup
app.post('/api/upload', upload.single('image'), (req, res) => {
  try {
    const { title, username, category, description } = req.body;

    // Validate inputs
    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Title is required.' });
    }
    if (!username || !username.trim()) {
      return res.status(400).json({ error: 'Username is required.' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'Setup image is required.' });
    }

    const setups = readDB();
    const isPrivate = req.body.private === 'true' || req.body.private === true;
    const newSetup = {
      id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
      title: title.trim(),
      username: username.trim(),
      description: (description || '').trim(),
      category: category || 'Other',
      image_url: `/uploads/${req.file.filename}`,
      likes: 0,
      created_at: new Date().toISOString(),
      comments: [],
      private: isPrivate
    };

    setups.unshift(newSetup); // Add to the front
    writeDB(setups);

    res.status(201).json(newSetup);
  } catch (err) {
    console.error('Error adding setup:', err);
    res.status(500).json({ error: 'Failed to process setup upload.' });
  }
});

// Like for a setup
app.post('/api/setups/:id/like', (req, res) => {
  const { username } = req.body;
  if (!username || !username.trim()) {
    return res.status(400).json({ error: 'Username is required to like a setup.' });
  }

  const setups = readDB();
  const setupIndex = setups.findIndex(s => s.id === req.params.id);

  if (setupIndex === -1) {
    return res.status(404).json({ error: 'Setup not found.' });
  }

  const cleanUsername = username.trim();
  if (!setups[setupIndex].liked_by) {
    setups[setupIndex].liked_by = [];
  }

  const exists = setups[setupIndex].liked_by.some(u => u.toLowerCase() === cleanUsername.toLowerCase());
  if (!exists) {
    setups[setupIndex].liked_by.push(cleanUsername);
  }
  setups[setupIndex].likes = setups[setupIndex].liked_by.length;
  writeDB(setups);

  res.json(setups[setupIndex]);
});

// Unlike for a setup
app.post('/api/setups/:id/unlike', (req, res) => {
  const { username } = req.body;
  if (!username || !username.trim()) {
    return res.status(400).json({ error: 'Username is required to unlike a setup.' });
  }

  const setups = readDB();
  const setupIndex = setups.findIndex(s => s.id === req.params.id);

  if (setupIndex === -1) {
    return res.status(404).json({ error: 'Setup not found.' });
  }

  const cleanUsername = username.trim().toLowerCase();
  if (setups[setupIndex].liked_by) {
    setups[setupIndex].liked_by = setups[setupIndex].liked_by.filter(u => u.toLowerCase() !== cleanUsername);
  } else {
    setups[setupIndex].liked_by = [];
  }
  setups[setupIndex].likes = setups[setupIndex].liked_by.length;
  writeDB(setups);

  res.json(setups[setupIndex]);
});

// Add comment to a setup
app.post('/api/setups/:id/comments', (req, res) => {
  const { username, text } = req.body;
  if (!username || !username.trim()) {
    return res.status(400).json({ error: 'Username is required to comment.' });
  }
  if (!text || !text.trim()) {
    return res.status(400).json({ error: 'Comment text cannot be empty.' });
  }

  const setups = readDB();
  const setupIndex = setups.findIndex(s => s.id === req.params.id);

  if (setupIndex === -1) {
    return res.status(404).json({ error: 'Setup not found.' });
  }

  const newComment = {
    id: Date.now().toString(36) + Math.random().toString(36).substr(2, 4),
    username: username.trim(),
    text: text.trim(),
    created_at: new Date().toISOString()
  };

  setups[setupIndex].comments.push(newComment);
  writeDB(setups);

  res.status(201).json(newComment);
});

// Add reply to a comment
app.post('/api/setups/:id/comments/:commentId/replies', (req, res) => {
  const { username, text } = req.body;
  if (!username || !username.trim()) {
    return res.status(400).json({ error: 'Username is required to reply.' });
  }
  if (!text || !text.trim()) {
    return res.status(400).json({ error: 'Reply text cannot be empty.' });
  }

  const setups = readDB();
  const setupIndex = setups.findIndex(s => s.id === req.params.id);
  if (setupIndex === -1) {
    return res.status(404).json({ error: 'Setup not found.' });
  }

  const comment = setups[setupIndex].comments.find(c => c.id === req.params.commentId);
  if (!comment) {
    return res.status(404).json({ error: 'Comment not found.' });
  }

  if (!comment.replies) {
    comment.replies = [];
  }

  const newReply = {
    id: Date.now().toString(36) + Math.random().toString(36).substr(2, 4),
    username: username.trim(),
    text: text.trim(),
    created_at: new Date().toISOString()
  };

  comment.replies.push(newReply);
  writeDB(setups);

  res.status(201).json(newReply);
});

// Edit a top-level comment
app.post('/api/setups/:id/comments/:commentId/edit', (req, res) => {
  const { username, text } = req.body;
  if (!username || !username.trim()) {
    return res.status(400).json({ error: 'Username is required to edit comment.' });
  }
  if (!text || !text.trim()) {
    return res.status(400).json({ error: 'Comment text cannot be empty.' });
  }

  const setups = readDB();
  const setupIndex = setups.findIndex(s => s.id === req.params.id);
  if (setupIndex === -1) {
    return res.status(404).json({ error: 'Setup not found.' });
  }

  const comment = setups[setupIndex].comments.find(c => c.id === req.params.commentId);
  if (!comment) {
    return res.status(404).json({ error: 'Comment not found.' });
  }

  // Author authorization check
  if (comment.username.toLowerCase() !== username.trim().toLowerCase()) {
    return res.status(403).json({ error: 'You are not authorized to edit this comment.' });
  }

  comment.text = text.trim();
  writeDB(setups);

  res.json(comment);
});

// Edit a nested reply
app.post('/api/setups/:id/comments/:commentId/replies/:replyId/edit', (req, res) => {
  const { username, text } = req.body;
  if (!username || !username.trim()) {
    return res.status(400).json({ error: 'Username is required to edit reply.' });
  }
  if (!text || !text.trim()) {
    return res.status(400).json({ error: 'Reply text cannot be empty.' });
  }

  const setups = readDB();
  const setupIndex = setups.findIndex(s => s.id === req.params.id);
  if (setupIndex === -1) {
    return res.status(404).json({ error: 'Setup not found.' });
  }

  const comment = setups[setupIndex].comments.find(c => c.id === req.params.commentId);
  if (!comment) {
    return res.status(404).json({ error: 'Comment not found.' });
  }

  const reply = comment.replies ? comment.replies.find(r => r.id === req.params.replyId) : null;
  if (!reply) {
    return res.status(404).json({ error: 'Reply not found.' });
  }

  // Author authorization check
  if (reply.username.toLowerCase() !== username.trim().toLowerCase()) {
    return res.status(403).json({ error: 'You are not authorized to edit this reply.' });
  }

  reply.text = text.trim();
  writeDB(setups);

  res.json(reply);
});

// Delete a top-level comment
app.post('/api/setups/:id/comments/:commentId/delete', (req, res) => {
  const { username } = req.body;
  if (!username || !username.trim()) {
    return res.status(400).json({ error: 'Username is required to delete comment.' });
  }

  const setups = readDB();
  const setupIndex = setups.findIndex(s => s.id === req.params.id);
  if (setupIndex === -1) {
    return res.status(404).json({ error: 'Setup not found.' });
  }

  const commentIndex = setups[setupIndex].comments.findIndex(c => c.id === req.params.commentId);
  if (commentIndex === -1) {
    return res.status(404).json({ error: 'Comment not found.' });
  }

  const comment = setups[setupIndex].comments[commentIndex];
  const setupHost = setups[setupIndex].username;

  // Authorization check: comment author OR setup host (moderator)
  const normUser = username.trim().toLowerCase();
  const isAuthor = comment.username.toLowerCase() === normUser;
  const isHost = setupHost.toLowerCase() === normUser;

  if (!isAuthor && !isHost) {
    return res.status(403).json({ error: 'You are not authorized to delete this comment.' });
  }

  setups[setupIndex].comments.splice(commentIndex, 1);
  writeDB(setups);

  res.json({ success: true });
});

// Delete a nested reply
app.post('/api/setups/:id/comments/:commentId/replies/:replyId/delete', (req, res) => {
  const { username } = req.body;
  if (!username || !username.trim()) {
    return res.status(400).json({ error: 'Username is required to delete reply.' });
  }

  const setups = readDB();
  const setupIndex = setups.findIndex(s => s.id === req.params.id);
  if (setupIndex === -1) {
    return res.status(404).json({ error: 'Setup not found.' });
  }

  const comment = setups[setupIndex].comments.find(c => c.id === req.params.commentId);
  if (!comment) {
    return res.status(404).json({ error: 'Comment not found.' });
  }

  const replyIndex = comment.replies ? comment.replies.findIndex(r => r.id === req.params.replyId) : -1;
  if (replyIndex === -1) {
    return res.status(404).json({ error: 'Reply not found.' });
  }

  const reply = comment.replies[replyIndex];
  const setupHost = setups[setupIndex].username;
  const parentCommentAuthor = comment.username;

  // Authorization check: reply author OR parent comment author OR setup host
  const normUser = username.trim().toLowerCase();
  const isAuthor = reply.username.toLowerCase() === normUser;
  const isParentAuthor = parentCommentAuthor.toLowerCase() === normUser;
  const isHost = setupHost.toLowerCase() === normUser;

  if (!isAuthor && !isParentAuthor && !isHost) {
    return res.status(403).json({ error: 'You are not authorized to delete this reply.' });
  }

  comment.replies.splice(replyIndex, 1);
  writeDB(setups);

  res.json({ success: true });
});

// Search users by username
app.get('/api/search/users', (req, res) => {
  const query = (req.query.q || '').trim().toLowerCase();
  if (!query) {
    return res.json([]);
  }

  const setups = readDB();
  const profiles = readProfiles();
  const seenUsers = new Set();
  const uniqueUsers = [];
  const results = [];

  const addUser = (username) => {
    if (!username) return;
    const trimmed = username.trim();
    const normalized = trimmed.toLowerCase();
    if (!seenUsers.has(normalized)) {
      seenUsers.add(normalized);
      uniqueUsers.push(trimmed);
    }
  };

  // 1. Gather users from setups (creators)
  setups.forEach(s => {
    addUser(s.username);
    // Gather users from comments
    if (s.comments) {
      s.comments.forEach(c => {
        addUser(c.username);
        if (c.replies) {
          c.replies.forEach(r => {
            addUser(r.username);
          });
        }
      });
    }
  });

  // 2. Gather users from profile database
  Object.keys(profiles).forEach(k => {
    const originalSetupUser = setups.find(s => s.username.toLowerCase() === k);
    if (originalSetupUser) {
      addUser(originalSetupUser.username);
    } else {
      addUser(k);
    }
  });

  // Filter unique items by query
  uniqueUsers.forEach(user => {
    if (user.toLowerCase().includes(query)) {
      const key = user.toLowerCase();
      const profile = profiles[key];
      results.push({
        username: user,
        avatar_url: profile ? profile.avatar_url : ""
      });
    }
  });

  res.json(results);
});

// Update profile username across database (setups and comments)
app.post('/api/profile/update', (req, res) => {
  const { oldUsername, newUsername } = req.body;
  if (!oldUsername || !oldUsername.trim() || !newUsername || !newUsername.trim()) {
    return res.status(400).json({ error: 'Old username and new username are required.' });
  }

  const oldNameNormalized = oldUsername.trim().toLowerCase();
  const newNameClean = newUsername.trim();

  const setups = readDB();
  let updatedCount = 0;

  setups.forEach(setup => {
    // Update setup creator username
    if (setup.username.toLowerCase() === oldNameNormalized) {
      setup.username = newNameClean;
      updatedCount++;
    }
    // Update comment author usernames
    if (setup.comments) {
      setup.comments.forEach(comment => {
        if (comment.username.toLowerCase() === oldNameNormalized) {
          comment.username = newNameClean;
          updatedCount++;
        }
        // Update reply usernames and text mentions
        if (comment.replies) {
          comment.replies.forEach(reply => {
            if (reply.username.toLowerCase() === oldNameNormalized) {
              reply.username = newNameClean;
              updatedCount++;
            }
            // Update text mentions e.g. @oldUsername -> @newUsername
            const oldMention = `@${oldUsername}`;
            if (reply.text.includes(oldMention)) {
              reply.text = reply.text.replace(new RegExp(oldMention, 'gi'), `@${newNameClean}`);
              updatedCount++;
            }
          });
        }
      });
    }
    // Update liked_by usernames
    if (setup.liked_by) {
      setup.liked_by = setup.liked_by.map(u => {
        if (u.toLowerCase() === oldNameNormalized) {
          updatedCount++;
          return newNameClean;
        }
        return u;
      });
    }
  });

  if (updatedCount > 0) {
    writeDB(setups);
  }

  // Update profiles.json database if username changed
  const profiles = readProfiles();
  if (profiles[oldNameNormalized]) {
    profiles[newNameClean.toLowerCase()] = { ...profiles[oldNameNormalized] };
    delete profiles[oldNameNormalized];
    writeProfiles(profiles);
  }

  res.json({ success: true, updatedCount });
});

// Get all profiles map
app.get('/api/profiles', (req, res) => {
  res.json(readProfiles());
});

// Get individual profile details
app.get('/api/profile/:username', (req, res) => {
  const profiles = readProfiles();
  const key = req.params.username.trim().toLowerCase();
  
  if (profiles[key]) {
    res.json(profiles[key]);
  } else {
    res.json({
      bio: "",
      twitter: "",
      instagram: "",
      github: "",
      avatar_url: ""
    });
  }
});

// Update individual profile details
app.post('/api/profile/:username', (req, res) => {
  const profiles = readProfiles();
  const key = req.params.username.trim().toLowerCase();
  
  const { bio, twitter, instagram, github } = req.body;
  
  profiles[key] = {
    ...profiles[key],
    bio: (bio || "").trim(),
    twitter: (twitter || "").trim(),
    instagram: (instagram || "").trim(),
    github: (github || "").trim()
  };
  
  writeProfiles(profiles);
  res.json(profiles[key]);
});

// Upload profile avatar
app.post('/api/profile/:username/avatar', upload.single('avatar'), (req, res) => {
  try {
    const key = req.params.username.trim().toLowerCase();
    
    if (!req.file) {
      return res.status(400).json({ error: 'No avatar file uploaded.' });
    }
    
    const profiles = readProfiles();
    
    // Delete old avatar if it was a custom file
    if (profiles[key] && profiles[key].avatar_url) {
      const oldUrl = profiles[key].avatar_url;
      if (oldUrl.startsWith('/uploads/')) {
        const oldFilePath = path.join(__dirname, 'public', oldUrl);
        if (fs.existsSync(oldFilePath)) {
          try {
            fs.unlinkSync(oldFilePath);
          } catch (err) {
            console.error('Failed to delete old avatar:', err);
          }
        }
      }
    }
    
    if (!profiles[key]) {
      profiles[key] = { bio: "", twitter: "", instagram: "", github: "" };
    }
    
    profiles[key].avatar_url = `/uploads/${req.file.filename}`;
    
    writeProfiles(profiles);
    res.json({ avatar_url: profiles[key].avatar_url });
  } catch (err) {
    console.error('Error uploading avatar:', err);
    res.status(500).json({ error: 'Failed to upload profile avatar.' });
  }
});

// Remove profile avatar
app.post('/api/profile/:username/avatar/remove', (req, res) => {
  const profiles = readProfiles();
  const key = req.params.username.trim().toLowerCase();
  
  if (profiles[key] && profiles[key].avatar_url) {
    const oldUrl = profiles[key].avatar_url;
    if (oldUrl.startsWith('/uploads/')) {
      const oldFilePath = path.join(__dirname, 'public', oldUrl);
      if (fs.existsSync(oldFilePath)) {
        try {
          fs.unlinkSync(oldFilePath);
        } catch (err) {
          console.error('Failed to delete avatar:', err);
        }
      }
    }
    profiles[key].avatar_url = "";
    writeProfiles(profiles);
  }
  res.json({ success: true });
});

// Edit setup details
app.post('/api/setups/:id/edit', (req, res) => {
  const { title, category, description, private: isPrivate } = req.body;
  
  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'Title is required.' });
  }
  if (!category) {
    return res.status(400).json({ error: 'Category is required.' });
  }

  const setups = readDB();
  const setupIndex = setups.findIndex(s => s.id === req.params.id);

  if (setupIndex === -1) {
    return res.status(404).json({ error: 'Setup not found.' });
  }

  setups[setupIndex].title = title.trim();
  setups[setupIndex].category = category;
  setups[setupIndex].description = (description || '').trim();
  if (isPrivate !== undefined) {
    setups[setupIndex].private = isPrivate === true || isPrivate === 'true';
  }

  writeDB(setups);
  res.json(setups[setupIndex]);
});

// Delete setup
app.post('/api/setups/:id/delete', (req, res) => {
  const setups = readDB();
  const setupIndex = setups.findIndex(s => s.id === req.params.id);

  if (setupIndex === -1) {
    return res.status(404).json({ error: 'Setup not found.' });
  }

  // Optional: delete image file from server uploads folder to save disk space
  const imageUrl = setups[setupIndex].image_url;
  if (imageUrl.startsWith('/uploads/')) {
    const filePath = path.join(__dirname, 'public', imageUrl);
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (err) {
        console.error('Failed to delete image file:', err);
      }
    }
  }

  setups.splice(setupIndex, 1);
  writeDB(setups);

  res.json({ success: true });
});

// Error handling middleware for Multer issues
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'Image size exceeds the 10MB limit.' });
    }
    return res.status(400).json({ error: `Upload error: ${err.message}` });
  } else if (err) {
    return res.status(400).json({ error: err.message });
  }
  next();
});

// Start the server
app.listen(PORT, () => {
  console.log(`DeskFlex server is running at http://localhost:${PORT}`);
});
