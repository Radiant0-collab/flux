(function () {
  // Check if we are running on GitHub Pages (github.io)
  const isGitHubPages = window.location.hostname.includes('github.io');
  
  if (!isGitHubPages) {
    // If not on GitHub Pages, use the real Node.js backend!
    return;
  }

  console.log("Flux: Running in GitHub Pages static mode. Intercepting API requests via virtual backend.");

  // Seed setups database in localStorage if not present
  if (!localStorage.getItem('flux_setups')) {
    localStorage.setItem('flux_setups', JSON.stringify([
      {
        id: "mock_post_1",
        title: "Cozy Coding Corner",
        username: "CosmicArchitect_784",
        description: "My setup for building web apps and coding late at night. Features a split mechanical keyboard and dual curved monitors.",
        category: "Productivity",
        image_url: "https://images.unsplash.com/photo-1547082299-de196ea013d6?w=800&auto=format&fit=crop&q=60",
        likes: 12,
        created_at: new Date(Date.now() - 3600000 * 24).toISOString(), // 1 day ago
        comments: [
          {
            id: "comment_1",
            username: "CodeExplorer",
            text: "This looks super clean! What split keyboard is that?",
            created_at: new Date(Date.now() - 3600000 * 20).toISOString(),
            replies: [
              {
                id: "reply_1",
                username: "CosmicArchitect_784",
                text: "Thanks! It is an Ergodox EZ with Cherry MX Brown switches.",
                created_at: new Date(Date.now() - 3600000 * 18).toISOString()
              }
            ]
          }
        ],
        private: false,
        liked_by: ["CodeExplorer"]
      },
      {
        id: "mock_post_2",
        title: "Neon Gaming Station",
        username: "NeonKnight",
        description: "Vibrant RGB themed gaming setup. Liquid cooled with a customized desk mat.",
        category: "Gaming",
        image_url: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&auto=format&fit=crop&q=60",
        likes: 28,
        created_at: new Date(Date.now() - 3600000 * 12).toISOString(),
        comments: [],
        private: false,
        liked_by: []
      },
      {
        id: "mock_post_3",
        title: "Nordic Minimal Wood Desk",
        username: "NordicLines",
        description: "Minimalist workspace with solid oak desk, light gray felt pad, and single clean monitor arm.",
        category: "Minimal",
        image_url: "https://images.unsplash.com/photo-1513151233558-d860c5398176?w=800&auto=format&fit=crop&q=60",
        likes: 45,
        created_at: new Date(Date.now() - 3600000 * 48).toISOString(),
        comments: [],
        private: false,
        liked_by: []
      }
    ]));
  }

  // Seed profiles database in localStorage if not present
  if (!localStorage.getItem('flux_profiles')) {
    localStorage.setItem('flux_profiles', JSON.stringify({
      "cosmicarchitect_784": {
        bio: "Designing clean layout flows and premium creative spaces.",
        twitter: "cosmic_arch",
        instagram: "cosmic.arch",
        github: "CosmicArchitect",
        avatar_url: ""
      },
      "neonknight": {
        bio: "Hardcore gamer and RGB enthusiast. Liquid cooling is life.",
        twitter: "neonknight_gaming",
        instagram: "neonknight.gg",
        github: "",
        avatar_url: "https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=150&auto=format&fit=crop&q=60"
      },
      "nordiclines": {
        bio: "Architect & minimalist designer based in Copenhagen.",
        twitter: "",
        instagram: "nordic.lines",
        github: "nordiclines",
        avatar_url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=60"
      }
    }));
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

    // POST /api/profile/update
    if (pathname.endsWith('/api/profile/update') && method === 'POST') {
      const body = JSON.parse(options.body || '{}');
      const { oldUsername, newUsername } = body;
      
      const oldNameNormalized = oldUsername.trim().toLowerCase();
      const newNameClean = newUsername.trim();

      const setups = getSetups();
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
