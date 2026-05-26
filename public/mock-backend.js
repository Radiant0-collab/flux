(function () {
  // Check if we are running on GitHub Pages (github.io)
  const isGitHubPages = window.location.hostname.includes('github.io');
  
  if (!isGitHubPages) {
    // If not on GitHub Pages, use the real Node.js backend!
    return;
  }

  console.log("Flux: Running in GitHub Pages static mode. Intercepting API requests via virtual backend.");

  // Clean up any old AI posts/profiles from previous sessions
  try {
    let oldSetups = JSON.parse(localStorage.getItem('flux_setups') || '[]');
    if (oldSetups.some(s => s.id && s.id.startsWith('mock_'))) {
      localStorage.removeItem('flux_setups');
      localStorage.removeItem('flux_profiles');
    }
  } catch (e) {
    console.error(e);
  }

  // Seed setups database in localStorage if not present
  if (!localStorage.getItem('flux_setups')) {
    localStorage.setItem('flux_setups', JSON.stringify([]));
  }

  // Seed profiles database in localStorage if not present
  if (!localStorage.getItem('flux_profiles')) {
    localStorage.setItem('flux_profiles', JSON.stringify({}));
  }

  // Intercept window.fetch
  const originalFetch = window.fetch;
  window.fetch = async function (url, options) {
    let urlString = typeof url === 'string' ? url : url.url || '';
    
    // Parse URL path and query parameters
    const parsedUrl = new URL(urlString, window.location.origin);
    const pathname = parsedUrl.pathname;
    
    // Check if it is an API request
    if (pathname.includes('/api/')) {
      try {
        const responseData = await handleMockRequest(pathname, parsedUrl.searchParams, options);
        return new Response(JSON.stringify(responseData), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (err) {
        console.error("Virtual Backend Error:", err);
        return new Response(JSON.stringify({ error: err.message }), {
          status: err.status || 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
    
    return originalFetch.apply(this, arguments);
  };

  // Mock Request router
  async function handleMockRequest(pathname, searchParams, options) {
    const method = (options && options.method || 'GET').toUpperCase();
    
    // Read/write databases
    const getSetups = () => JSON.parse(localStorage.getItem('flux_setups') || '[]');
    const saveSetups = (data) => localStorage.setItem('flux_setups', JSON.stringify(data));
    const getProfiles = () => JSON.parse(localStorage.getItem('flux_profiles') || '{}');
    const saveProfiles = (data) => localStorage.setItem('flux_profiles', JSON.stringify(data));

    // GET /api/setups
    if (pathname.endsWith('/api/setups') && method === 'GET') {
      const sort = searchParams.get('sort');
      const currentViewer = searchParams.get('username') || '';
      
      let setups = getSetups();
      
      // Filter out private setups unless the viewer is the creator
      setups = setups.filter(setup => {
        if (setup.private) {
          return setup.username.toLowerCase() === currentViewer.toLowerCase();
        }
        return true;
      });

      // Sorting
      if (sort === 'likes' || sort === 'votes') {
        setups.sort((a, b) => b.likes - a.likes);
      } else {
        // default newest
        setups.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      }
      
      return setups;
    }

    // POST /api/upload
    if (pathname.endsWith('/api/upload') && method === 'POST') {
      const formData = options.body;
      let title, category, description, username, isPrivate, imageFile;
      
      if (formData instanceof FormData) {
        title = formData.get('title');
        category = formData.get('category');
        description = formData.get('description');
        username = formData.get('username');
        isPrivate = formData.get('private') === 'true';
        imageFile = formData.get('image');
      } else {
        const body = JSON.parse(options.body || '{}');
        title = body.title;
        category = body.category;
        description = body.description;
        username = body.username;
        isPrivate = body.private === true;
      }

      let imageUrl = "https://images.unsplash.com/photo-1585776245991-cf89dd7fc73a?w=800&auto=format&fit=crop&q=60";
      if (imageFile instanceof File) {
        imageUrl = await fileToDataURL(imageFile);
      }

      const newSetup = {
        id: "post_" + Math.random().toString(36).substr(2, 9),
        title: title || "Untitled Setup",
        username: username || "Anonymous",
        description: description || "",
        category: category || "Other",
        image_url: imageUrl,
        likes: 0,
        created_at: new Date().toISOString(),
        comments: [],
        private: isPrivate,
        liked_by: []
      };

      const setups = getSetups();
      setups.unshift(newSetup);
      saveSetups(setups);
      return newSetup;
    }

    // GET /api/setups/:id
    const setupIdMatch = pathname.match(/\/api\/setups\/([a-zA-Z0-9_-]+)$/);
    if (setupIdMatch && method === 'GET') {
      const setupId = setupIdMatch[1];
      const setups = getSetups();
      const setup = setups.find(s => s.id === setupId);
      if (!setup) {
        const err = new Error("Setup not found.");
        err.status = 404;
        throw err;
      }
      return setup;
    }

    // POST /api/setups/:id/edit
    const setupEditMatch = pathname.match(/\/api\/setups\/([a-zA-Z0-9_-]+)\/edit$/);
    if (setupEditMatch && method === 'POST') {
      const setupId = setupEditMatch[1];
      const body = JSON.parse(options.body || '{}');
      const setups = getSetups();
      const idx = setups.findIndex(s => s.id === setupId);
      if (idx === -1) {
        const err = new Error("Setup not found.");
        err.status = 404;
        throw err;
      }
      setups[idx].title = body.title || setups[idx].title;
      setups[idx].category = body.category || setups[idx].category;
      setups[idx].description = body.description !== undefined ? body.description : setups[idx].description;
      if (body.private !== undefined) {
        setups[idx].private = body.private === true || body.private === 'true';
      }
      saveSetups(setups);
      return setups[idx];
    }

    // POST /api/setups/:id/delete
    const setupDeleteMatch = pathname.match(/\/api\/setups\/([a-zA-Z0-9_-]+)\/delete$/);
    if (setupDeleteMatch && method === 'POST') {
      const setupId = setupDeleteMatch[1];
      let setups = getSetups();
      setups = setups.filter(s => s.id !== setupId);
      saveSetups(setups);
      return { success: true };
    }

    // POST /api/setups/:id/comments
    const commentsMatch = pathname.match(/\/api\/setups\/([a-zA-Z0-9_-]+)\/comments$/);
    if (commentsMatch && method === 'POST') {
      const setupId = commentsMatch[1];
      const body = JSON.parse(options.body || '{}');
      const setups = getSetups();
      const idx = setups.findIndex(s => s.id === setupId);
      if (idx === -1) {
        const err = new Error("Setup not found.");
        err.status = 404;
        throw err;
      }
      
      const newComment = {
        id: "comment_" + Math.random().toString(36).substr(2, 9),
        username: body.username || "Anonymous",
        text: body.text || "",
        created_at: new Date().toISOString(),
        replies: []
      };

      setups[idx].comments = setups[idx].comments || [];
      setups[idx].comments.push(newComment);
      saveSetups(setups);
      return setups[idx];
    }

    // POST /api/setups/:id/comments/:commentId/replies
    const repliesMatch = pathname.match(/\/api\/setups\/([a-zA-Z0-9_-]+)\/comments\/([a-zA-Z0-9_-]+)\/replies$/);
    if (repliesMatch && method === 'POST') {
      const setupId = repliesMatch[1];
      const commentId = repliesMatch[2];
      const body = JSON.parse(options.body || '{}');
      const setups = getSetups();
      const idx = setups.findIndex(s => s.id === setupId);
      if (idx === -1) {
        const err = new Error("Setup not found.");
        err.status = 404;
        throw err;
      }
      
      const comment = setups[idx].comments.find(c => c.id === commentId);
      if (!comment) {
        const err = new Error("Comment not found.");
        err.status = 404;
        throw err;
      }

      const newReply = {
        id: "reply_" + Math.random().toString(36).substr(2, 9),
        username: body.username || "Anonymous",
        text: body.text || "",
        created_at: new Date().toISOString()
      };

      comment.replies = comment.replies || [];
      comment.replies.push(newReply);
      saveSetups(setups);
      return setups[idx];
    }

    // POST /api/setups/:id/comments/:commentId/edit
    const commentEditMatch = pathname.match(/\/api\/setups\/([a-zA-Z0-9_-]+)\/comments\/([a-zA-Z0-9_-]+)\/edit$/);
    if (commentEditMatch && method === 'POST') {
      const setupId = commentEditMatch[1];
      const commentId = commentEditMatch[2];
      const body = JSON.parse(options.body || '{}');
      const setups = getSetups();
      const idx = setups.findIndex(s => s.id === setupId);
      if (idx === -1) {
        const err = new Error("Setup not found.");
        err.status = 404;
        throw err;
      }
      const comment = setups[idx].comments.find(c => c.id === commentId);
      if (!comment) {
        const err = new Error("Comment not found.");
        err.status = 404;
        throw err;
      }
      if (comment.username.toLowerCase() !== body.username.trim().toLowerCase()) {
        const err = new Error("You are not authorized to edit this comment.");
        err.status = 403;
        throw err;
      }
      comment.text = body.text.trim();
      saveSetups(setups);
      return comment;
    }

    // POST /api/setups/:id/comments/:commentId/replies/:replyId/edit
    const replyEditMatch = pathname.match(/\/api\/setups\/([a-zA-Z0-9_-]+)\/comments\/([a-zA-Z0-9_-]+)\/replies\/([a-zA-Z0-9_-]+)\/edit$/);
    if (replyEditMatch && method === 'POST') {
      const setupId = replyEditMatch[1];
      const commentId = replyEditMatch[2];
      const replyId = replyEditMatch[3];
      const body = JSON.parse(options.body || '{}');
      const setups = getSetups();
      const idx = setups.findIndex(s => s.id === setupId);
      if (idx === -1) {
        const err = new Error("Setup not found.");
        err.status = 404;
        throw err;
      }
      const comment = setups[idx].comments.find(c => c.id === commentId);
      if (!comment) {
        const err = new Error("Comment not found.");
        err.status = 404;
        throw err;
      }
      const reply = comment.replies ? comment.replies.find(r => r.id === replyId) : null;
      if (!reply) {
        const err = new Error("Reply not found.");
        err.status = 404;
        throw err;
      }
      if (reply.username.toLowerCase() !== body.username.trim().toLowerCase()) {
        const err = new Error("You are not authorized to edit this reply.");
        err.status = 403;
        throw err;
      }
      reply.text = body.text.trim();
      saveSetups(setups);
      return reply;
    }

    // POST /api/setups/:id/comments/:commentId/delete
    const commentDeleteMatch = pathname.match(/\/api\/setups\/([a-zA-Z0-9_-]+)\/comments\/([a-zA-Z0-9_-]+)\/delete$/);
    if (commentDeleteMatch && method === 'POST') {
      const setupId = commentDeleteMatch[1];
      const commentId = commentDeleteMatch[2];
      const body = JSON.parse(options.body || '{}');
      const setups = getSetups();
      const idx = setups.findIndex(s => s.id === setupId);
      if (idx === -1) {
        const err = new Error("Setup not found.");
        err.status = 404;
        throw err;
      }
      const commentIndex = setups[idx].comments.findIndex(c => c.id === commentId);
      if (commentIndex === -1) {
        const err = new Error("Comment not found.");
        err.status = 404;
        throw err;
      }
      const comment = setups[idx].comments[commentIndex];
      const setupHost = setups[idx].username;
      const normUser = body.username.trim().toLowerCase();
      const isAuthor = comment.username.toLowerCase() === normUser;
      const isHost = setupHost.toLowerCase() === normUser;
      if (!isAuthor && !isHost) {
        const err = new Error("You are not authorized to delete this comment.");
        err.status = 403;
        throw err;
      }
      setups[idx].comments.splice(commentIndex, 1);
      saveSetups(setups);
      return { success: true };
    }

    // POST /api/setups/:id/comments/:commentId/replies/:replyId/delete
    const replyDeleteMatch = pathname.match(/\/api\/setups\/([a-zA-Z0-9_-]+)\/comments\/([a-zA-Z0-9_-]+)\/replies\/([a-zA-Z0-9_-]+)\/delete$/);
    if (replyDeleteMatch && method === 'POST') {
      const setupId = replyDeleteMatch[1];
      const commentId = replyDeleteMatch[2];
      const replyId = replyDeleteMatch[3];
      const body = JSON.parse(options.body || '{}');
      const setups = getSetups();
      const idx = setups.findIndex(s => s.id === setupId);
      if (idx === -1) {
        const err = new Error("Setup not found.");
        err.status = 404;
        throw err;
      }
      const comment = setups[idx].comments.find(c => c.id === commentId);
      if (!comment) {
        const err = new Error("Comment not found.");
        err.status = 404;
        throw err;
      }
      const replyIndex = comment.replies ? comment.replies.findIndex(r => r.id === replyId) : -1;
      if (replyIndex === -1) {
        const err = new Error("Reply not found.");
        err.status = 404;
        throw err;
      }
      const reply = comment.replies[replyIndex];
      const setupHost = setups[idx].username;
      const parentCommentAuthor = comment.username;
      const normUser = body.username.trim().toLowerCase();
      const isAuthor = reply.username.toLowerCase() === normUser;
      const isParentAuthor = parentCommentAuthor.toLowerCase() === normUser;
      const isHost = setupHost.toLowerCase() === normUser;
      if (!isAuthor && !isParentAuthor && !isHost) {
        const err = new Error("You are not authorized to delete this reply.");
        err.status = 403;
        throw err;
      }
      comment.replies.splice(replyIndex, 1);
      saveSetups(setups);
      return { success: true };
    }

    // POST /api/setups/:id/like or unlike
    const likeMatch = pathname.match(/\/api\/setups\/([a-zA-Z0-9_-]+)\/(like|unlike)$/);
    if (likeMatch && method === 'POST') {
      const setupId = likeMatch[1];
      const type = likeMatch[2];
      const body = JSON.parse(options.body || '{}');
      const username = body.username;
      
      const setups = getSetups();
      const idx = setups.findIndex(s => s.id === setupId);
      if (idx !== -1) {
        setups[idx].liked_by = setups[idx].liked_by || [];
        if (type === 'like') {
          if (!setups[idx].liked_by.includes(username)) {
            setups[idx].liked_by.push(username);
            setups[idx].likes += 1;
          }
        } else {
          setups[idx].liked_by = setups[idx].liked_by.filter(u => u !== username);
          setups[idx].likes = Math.max(0, setups[idx].likes - 1);
        }
        saveSetups(setups);
        return setups[idx];
      }
    }

    // GET /api/profiles
    if (pathname.endsWith('/api/profiles') && method === 'GET') {
      return getProfiles();
    }

    // POST /api/profile/update
    if (pathname.endsWith('/api/profile/update') && method === 'POST') {
      const body = JSON.parse(options.body || '{}');
      const { oldUsername, newUsername } = body;
      
      const oldNameNormalized = oldUsername.trim().toLowerCase();
      const newNameClean = newUsername.trim();
      const newNameNormalized = newNameClean.toLowerCase();

      // Validate format
      const usernameRegex = /^[a-zA-Z0-9_-]{3,20}$/;
      if (!usernameRegex.test(newNameClean)) {
        const err = new Error("Username must be 3-20 characters long and contain only letters, numbers, underscores, or hyphens.");
        err.status = 400;
        throw err;
      }

      const setups = getSetups();

      // Validate uniqueness if username is actually changing (ignoring case)
      if (oldNameNormalized !== newNameNormalized) {
        const profiles = getProfiles();
        const isProfileTaken = !!profiles[newNameNormalized];
        const isSetupTaken = setups.some(s => s.username.toLowerCase() === newNameNormalized);
        if (isProfileTaken || isSetupTaken) {
          const err = new Error("Username is already taken.");
          err.status = 400;
          throw err;
        }
      }
      setups.forEach(setup => {
        if (setup.username.toLowerCase() === oldNameNormalized) {
          setup.username = newNameClean;
        }
        if (setup.comments) {
          setup.comments.forEach(comment => {
            if (comment.username.toLowerCase() === oldNameNormalized) {
              comment.username = newNameClean;
            }
            if (comment.replies) {
              comment.replies.forEach(reply => {
                if (reply.username.toLowerCase() === oldNameNormalized) {
                  reply.username = newNameClean;
                }
                const oldMention = `@${oldUsername}`;
                if (reply.text.includes(oldMention)) {
                  reply.text = reply.text.replace(new RegExp(oldMention, 'gi'), `@${newNameClean}`);
                }
              });
            }
          });
        }
        if (setup.liked_by) {
          setup.liked_by = setup.liked_by.map(u => u.toLowerCase() === oldNameNormalized ? newNameClean : u);
        }
      });
      saveSetups(setups);

      const profiles = getProfiles();
      if (profiles[oldNameNormalized]) {
        profiles[newNameClean.toLowerCase()] = { ...profiles[oldNameNormalized] };
        delete profiles[oldNameNormalized];
        saveProfiles(profiles);
      }

      return { success: true };
    }

    // GET /api/profile/:username
    const profileMatch = pathname.match(/\/api\/profile\/([^/]+)$/);
    if (profileMatch && method === 'GET') {
      const username = decodeURIComponent(profileMatch[1]).trim().toLowerCase();
      const profiles = getProfiles();
      if (profiles[username]) {
        return profiles[username];
      } else {
        return {
          bio: "",
          twitter: "",
          instagram: "",
          github: "",
          avatar_url: ""
        };
      }
    }

    // POST /api/profile/:username
    if (profileMatch && method === 'POST') {
      const username = decodeURIComponent(profileMatch[1]).trim().toLowerCase();
      const body = JSON.parse(options.body || '{}');
      const profiles = getProfiles();
      
      profiles[username] = {
        ...profiles[username],
        bio: (body.bio || "").trim(),
        twitter: (body.twitter || "").trim(),
        instagram: (body.instagram || "").trim(),
        github: (body.github || "").trim()
      };
      
      saveProfiles(profiles);
      return profiles[username];
    }

    // POST /api/profile/:username/avatar
    const avatarMatch = pathname.match(/\/api\/profile\/([^/]+)\/avatar$/);
    if (avatarMatch && method === 'POST') {
      const username = decodeURIComponent(avatarMatch[1]).trim().toLowerCase();
      const formData = options.body;
      let avatarFile;
      if (formData instanceof FormData) {
        avatarFile = formData.get('avatar');
      }
      
      let avatarUrl = "";
      if (avatarFile instanceof File) {
        avatarUrl = await fileToDataURL(avatarFile);
      }
      
      const profiles = getProfiles();
      if (!profiles[username]) {
        profiles[username] = { bio: "", twitter: "", instagram: "", github: "" };
      }
      profiles[username].avatar_url = avatarUrl;
      saveProfiles(profiles);
      return { avatar_url: avatarUrl };
    }

    // POST /api/profile/:username/avatar/remove
    const avatarRemoveMatch = pathname.match(/\/api\/profile\/([^/]+)\/avatar\/remove$/);
    if (avatarRemoveMatch && method === 'POST') {
      const username = decodeURIComponent(avatarRemoveMatch[1]).trim().toLowerCase();
      const profiles = getProfiles();
      if (profiles[username]) {
        profiles[username].avatar_url = "";
        saveProfiles(profiles);
      }
      return { success: true };
    }



    // GET /api/search/users
    if (pathname.endsWith('/api/search/users') && method === 'GET') {
      const query = (searchParams.get('q') || '').trim().toLowerCase();
      const profiles = getProfiles();
      const setups = getSetups();
      
      const uniqueUsers = new Set();
      const addUser = (name) => {
        if (name) {
          uniqueUsers.add(name);
        }
      };

      setups.forEach(s => addUser(s.username));
      Object.keys(profiles).forEach(k => {
        const originalSetupUser = setups.find(s => s.username.toLowerCase() === k);
        if (originalSetupUser) {
          addUser(originalSetupUser.username);
        } else {
          addUser(k);
        }
      });

      const results = [];
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

      return results;
    }

    const err = new Error("Route not found in virtual backend.");
    err.status = 404;
    throw err;
  }

  function fileToDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

})();
