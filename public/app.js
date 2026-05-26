// Flux Frontend Application Logic

window.addEventListener('error', (e) => {
  const container = document.getElementById('toast-container');
  if (container) {
    const toast = document.createElement('div');
    toast.className = 'toast error';
    toast.innerHTML = `<span style="font-weight:700; font-size:16px; line-height:1;">✕</span> Global Error: ${e.message}`;
    container.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('toast-fade-out');
      toast.addEventListener('animationend', () => toast.remove(), { once: true });
    }, 5000);
  }
});

document.addEventListener('DOMContentLoaded', () => {
  // Global State
  const state = {
    activeCategory: 'All',
    sortBy: 'newest',
    currentRoute: '#/',
    selectedFile: null,
    profiles: {},
    croppedAvatarBlob: null,
    feedLayout: 'feed' // 'feed' or 'grid'
  };

  // Upload cropper state
  let uploadImg = null;
  let uploadZoom = 1;
  let uploadImgX = 0;
  let uploadImgY = 0;
  let uploadActiveRatio = 'original';
  let uploadIsDragging = false;
  let uploadStartX = 0;
  let uploadStartY = 0;

  // DOM Elements
  const sections = {
    feed: document.getElementById('feed-page'),
    upload: document.getElementById('upload-page'),
    profile: document.getElementById('profile-page'),
    detail: document.getElementById('detail-page')
  };

  // Auto-username generator helper
  function getOrGenerateUsername() {
    let username = localStorage.getItem('deskflex_username');
    if (!username) {
      const prefixes = ['Cyber', 'Neon', 'Cosmic', 'RGB', 'Minimalist', 'Retro', 'Ergo', 'Pixel', 'Modder', 'Desk', 'Vibe', 'Mech', 'Gamer'];
      const nouns = ['Flexer', 'Ninja', 'Builder', 'Architect', 'Coder', 'Hustler', 'Enthusiast', 'Wizard', 'Voter', 'Rider', 'Chaser'];
      const randomNum = Math.floor(100 + Math.random() * 900);
      const p = prefixes[Math.floor(Math.random() * prefixes.length)];
      const n = nouns[Math.floor(Math.random() * nouns.length)];
      username = `${p}${n}_${randomNum}`;
      localStorage.setItem('deskflex_username', username);
    }
    return username;
  }
  function getTotalCommentsCount(setup) {
    if (!setup.comments) return 0;
    let count = setup.comments.length;
    setup.comments.forEach(c => {
      if (c.replies) count += c.replies.length;
    });
    return count;
  }
  const navLogo = document.getElementById('nav-logo');
  const setupCardsGrid = document.getElementById('setup-cards-grid');
  const feedEmptyState = document.getElementById('feed-empty-state');
  const feedSort = document.getElementById('feed-sort');
  const categoriesContainer = document.getElementById('categories-container');
  const toastContainer = document.getElementById('toast-container');
  const btnSwitchFeed = document.getElementById('btn-switch-feed');
  const btnSwitchGrid = document.getElementById('btn-switch-grid');

  // Upload Form Elements
  const uploadForm = document.getElementById('setup-upload-form');
  const fileDropzone = document.getElementById('file-dropzone');
  const setupImageInput = document.getElementById('setup-image-input');
  const uploadPrompt = document.getElementById('upload-prompt');
  const uploadPreviewContainer = document.getElementById('upload-preview-container');
  const uploadImgPreview = document.getElementById('upload-img-preview');
  const btnRemovePreview = document.getElementById('btn-remove-preview');
  
  const setupTitle = document.getElementById('setup-title');
  const setupCategory = document.getElementById('setup-category');
  const setupVisibility = document.getElementById('setup-visibility');
  const setupDescription = document.getElementById('setup-description');
  const charCount = document.getElementById('char-count');
  
  const errors = {
    image: document.getElementById('error-image'),
    title: document.getElementById('error-title'),
    category: document.getElementById('error-category'),
    general: document.getElementById('error-general')
  };

  // ==============================================
  // TOAST NOTIFICATIONS SYSTEM
  // ==============================================
  function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    // Add icon based on type
    const icon = type === 'error' ? '✕' : '✓';
    toast.innerHTML = `<span style="font-weight:700; font-size:16px; line-height:1;">${icon}</span> ${message}`;

    container.appendChild(toast);

    // After 2.5 seconds, slide it out
    setTimeout(() => {
      toast.classList.add('toast-fade-out');
      toast.addEventListener('animationend', () => toast.remove(), { once: true });
    }, 2500);
  }

  // ==============================================
  // LIKING LOCAL STORAGE SYSTEM
  // ==============================================
  function getLikedSetups() {
    return JSON.parse(localStorage.getItem('deskflex_likes') || '[]');
  }

  function hasLiked(setupId) {
    const liked = getLikedSetups();
    return liked.includes(setupId);
  }

  function recordLike(setupId) {
    const liked = getLikedSetups();
    if (!liked.includes(setupId)) {
      liked.push(setupId);
      localStorage.setItem('deskflex_likes', JSON.stringify(liked));
    }
  }

  function removeLike(setupId) {
    const liked = getLikedSetups();
    const idx = liked.indexOf(setupId);
    if (idx !== -1) {
      liked.splice(idx, 1);
      localStorage.setItem('deskflex_likes', JSON.stringify(liked));
    }
  }

  // ==============================================
  // ROUTER (Hash-Based SPA)
  // ==============================================
  function router() {
    const hash = window.location.hash || '#/';
    state.currentRoute = hash;

    // Reset page view animations
    Object.values(sections).forEach(sec => {
      sec.classList.add('hidden');
      sec.classList.remove('active');
    });

    // Match routes
    if (hash === '#/' || hash === '') {
      sections.feed.classList.remove('hidden');
      setTimeout(() => sections.feed.classList.add('active'), 20);
      loadFeed();
    } else if (hash === '#/upload') {
      sections.upload.classList.remove('hidden');
      setTimeout(() => sections.upload.classList.add('active'), 20);
      resetUploadForm();
    } else if (hash === '#/profile') {
      const user = getOrGenerateUsername();
      window.location.hash = `#/profile/${encodeURIComponent(user)}`;
    } else if (hash.startsWith('#/profile/')) {
      const profileUsername = decodeURIComponent(hash.split('#/profile/')[1]);
      sections.profile.classList.remove('hidden');
      setTimeout(() => sections.profile.classList.add('active'), 20);
      loadProfile(profileUsername);
    } else if (hash.startsWith('#/setup/')) {
      const setupId = hash.split('#/setup/')[1];
      sections.detail.classList.remove('hidden');
      setTimeout(() => sections.detail.classList.add('active'), 20);
      loadDetail(setupId);
    } else {
      // Fallback to home
      window.location.hash = '#/';
    }

    // Scroll to top on route change
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  window.addEventListener('hashchange', router);
  // Initial routing check
  router();

  // ==============================================
  // FEED PAGE LOGIC
  // ==============================================
  async function loadFeed() {
    setupCardsGrid.innerHTML = `
      <div class="loading-spinner-container">
        <div class="loading-spinner"></div>
        <p>Loading posts...</p>
      </div>
    `;
    feedEmptyState.classList.add('hidden');

    try {
      await fetchProfiles();
      const viewer = getOrGenerateUsername();
      const response = await fetch(`/api/setups?sort=${state.sortBy}&category=${state.activeCategory}&username=${encodeURIComponent(viewer)}&t=${Date.now()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch posts.');
      }
      
      const setups = await response.ok ? await response.json() : [];
      renderFeed(setups);
    } catch (err) {
      console.error(err);
      setupCardsGrid.innerHTML = '';
      showToast('Could not load posts. Please try again later.', 'error');
    }
  }

  function renderFeed(setups) {
  // Remove username display from feed cards (CSS will hide .card-username)

    setupCardsGrid.innerHTML = '';
    
    if (setups.length === 0) {
      feedEmptyState.classList.remove('hidden');
      return;
    }

    if (state.feedLayout === 'grid') {
      setupCardsGrid.className = 'setup-grid discovery-grid-layout';
      
      setups.forEach(setup => {
        const commentCount = getTotalCommentsCount(setup);
        const gridItem = document.createElement('div');
        gridItem.className = 'insta-grid-item';
        gridItem.style.aspectRatio = '1 / 1';
        gridItem.style.borderRadius = 'var(--radius-md)';
        gridItem.onclick = () => {
          window.location.hash = `#/setup/${setup.id}`;
        };
        
        gridItem.innerHTML = `
          <img src="${setup.image_url}" alt="${setup.title}" class="insta-grid-img" loading="lazy">
          <div class="insta-hover-overlay">
            <div class="overlay-stat"><i class="fa-solid fa-heart"></i> ${setup.likes}</div>
            <div class="overlay-stat"><i class="fa-solid fa-comment"></i> ${commentCount}</div>
          </div>
        `;
        setupCardsGrid.appendChild(gridItem);
      });
    } else {
      setupCardsGrid.className = 'setup-grid feed-stream-layout';
      
      setups.forEach(setup => {
        const liked = hasLiked(setup.id);
        const card = document.createElement('div');
        card.className = 'social-card';
        
        const userProfile = state.profiles[setup.username.toLowerCase()];
        const avatarHTML = (userProfile && userProfile.avatar_url)
          ? `<img src="${userProfile.avatar_url}" alt="${setup.username}">`
          : `${setup.username.slice(0, 2).toUpperCase()}`;

        // Get comments preview (2 most recent)
        const commentsCount = getTotalCommentsCount(setup);
        const recentComments = setup.comments ? [...setup.comments].sort((a,b) => new Date(a.created_at) - new Date(b.created_at)).slice(-2) : [];
        const commentsPreviewHTML = recentComments.map(c => `
          <div class="inline-comment-item">
            <span class="inline-comment-username" onclick="window.location.hash='#/profile/${encodeURIComponent(c.username)}'">${escapeHTML(c.username)}</span>
            <span>${escapeHTML(c.text)}</span>
          </div>
        `).join('');

        // Get current user avatar for quick comment field
        const myUsername = getOrGenerateUsername();
        const myProfile = state.profiles[myUsername.toLowerCase()];
        const myAvatarHTML = (myProfile && myProfile.avatar_url)
          ? `<img src="${myProfile.avatar_url}" alt="${myUsername}">`
          : `${myUsername.slice(0, 2).toUpperCase()}`;
        
        card.innerHTML = `
          <!-- Social Card Header -->
          <div class="social-card-header">
            <div class="social-card-user-info">
              <div class="social-card-avatar" onclick="window.location.hash='#/profile/${encodeURIComponent(setup.username)}'" style="cursor:pointer;">
                ${avatarHTML}
              </div>
              <div class="social-card-username-wrapper">
                <span class="social-card-username" onclick="window.location.hash='#/profile/${encodeURIComponent(setup.username)}'">${escapeHTML(setup.username)}</span>
                ${setup.private ? '<i class="fa-solid fa-lock private-lock-icon" title="Private Post" style="margin-left: 6px; color: var(--accent-pink); font-size: 11px;"></i>' : ''}
              </div>
            </div>
            <div class="social-card-header-right" style="display:flex; align-items:center; gap:10px;">
              <span class="social-card-category">${setup.category}</span>
              <button class="post-options-btn" data-id="${setup.id}" title="Options"><i class="fa-solid fa-ellipsis"></i></button>
            </div>
          </div>

          <!-- Setup Image with Animation Overlay -->
          <div class="social-card-img-wrapper">
            <img src="${setup.image_url}" alt="${setup.title}" class="social-card-img" loading="lazy">
            <i class="fa-solid fa-heart heart-pop"></i>
          </div>

          <!-- Social Card Footer / Actions -->
          <div class="social-card-footer">
            <div class="social-card-actions">
              <div class="actions-left-group">
                <button class="social-action-icon-btn heart-btn ${liked ? 'liked' : ''}" title="Like">
                  <i class="${liked ? 'fa-solid fa-heart' : 'fa-regular fa-heart'}"></i>
                </button>
                <button class="social-action-icon-btn comment-btn" title="View details & comments">
                  <i class="fa-regular fa-comment"></i>
                </button>
              </div>
              <button class="social-action-icon-btn share-btn" title="Share Setup">
                <i class="fa-regular fa-paper-plane"></i>
              </button>
            </div>

            <!-- Likes count -->
            <div class="social-card-likes-count">
              <span class="like-num">${setup.likes}</span> likes
            </div>

            <!-- Caption -->
            <div class="social-card-caption-block">
              <span class="caption-username" onclick="window.location.hash='#/profile/${encodeURIComponent(setup.username)}'">${escapeHTML(setup.username)}</span>
              <span class="caption-title" onclick="window.location.hash='#/setup/${setup.id}'" style="cursor:pointer; color:var(--accent-purple);">${escapeHTML(setup.title)}</span>
              <span class="caption-text">${setup.description ? escapeHTML(setup.description) : ''}</span>
            </div>

            <!-- Comments Preview -->
            <div class="social-card-comments-preview">
              ${commentsCount > 2 ? `<span class="view-all-comments-btn" onclick="window.location.hash='#/setup/${setup.id}'">View all ${commentsCount} comments</span>` : ''}
              ${commentsPreviewHTML}
            </div>

            <!-- Inline Quick Comment Form -->
            <form class="social-card-inline-comment-form">
              <div class="inline-comment-avatar">
                ${myAvatarHTML}
              </div>
              <div class="inline-comment-input-row">
                <input type="text" class="inline-comment-input" placeholder="Add a comment as ${escapeHTML(myUsername)}..." required maxlength="200">
                <button type="submit" class="inline-comment-submit-btn">Post</button>
              </div>
            </form>
          </div>
        `;

        // Action: Post Options Menu click
        const optionsBtn = card.querySelector('.post-options-btn');
        if (optionsBtn) {
          optionsBtn.addEventListener('click', () => {
            openPostOptionsModal(setup);
          });
        }

        // Action: Like Toggle button click
        const heartBtn = card.querySelector('.heart-btn');
        const likeCountEl = card.querySelector('.like-num');
        heartBtn.addEventListener('click', () => {
          handleLike(setup.id, heartBtn, likeCountEl);
        });

        // Action: Click likes count to view who liked
        const likesCountEl = card.querySelector('.social-card-likes-count');
        likesCountEl.addEventListener('click', () => {
          openLikesModal(setup.id);
        });

        // Action: Double click setup image to like
        const imgWrapper = card.querySelector('.social-card-img-wrapper');
        const heartPopEl = imgWrapper.querySelector('.heart-pop');
        imgWrapper.addEventListener('dblclick', () => {
          // Trigger double click heart pop animation
          heartPopEl.classList.remove('animate');
          void heartPopEl.offsetWidth; // Trigger reflow to restart animation
          heartPopEl.classList.add('animate');
          
          // Only cast like if not liked yet
          if (!hasLiked(setup.id)) {
            handleLike(setup.id, heartBtn, likeCountEl);
          }
        });

        // Action: Comment button click (go to detail view comments)
        const commentBtn = card.querySelector('.comment-btn');
        commentBtn.addEventListener('click', () => {
          window.location.hash = `#/setup/${setup.id}`;
        });

        // Action: Share button click (copy link)
        const shareBtn = card.querySelector('.share-btn');
        shareBtn.addEventListener('click', () => {
          const shareUrl = `${window.location.origin}${window.location.pathname}#/setup/${setup.id}`;
          navigator.clipboard.writeText(shareUrl)
            .then(() => showToast('Share link copied to clipboard!'))
            .catch(() => showToast('Failed to copy link.', 'error'));
        });

        // Action: Inline Quick Comment Form Submission
        const inlineCommentForm = card.querySelector('.social-card-inline-comment-form');
        const inlineCommentInput = card.querySelector('.inline-comment-input');
        const commentsPreviewContainer = card.querySelector('.social-card-comments-preview');

        inlineCommentForm.addEventListener('submit', async (e) => {
          e.preventDefault();
          const commentText = inlineCommentInput.value.trim();
          if (!commentText) return;

          const submitBtn = inlineCommentForm.querySelector('.inline-comment-submit-btn');
          try {
            submitBtn.disabled = true;
            const res = await fetch(`/api/setups/${setup.id}/comments`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ username: myUsername, text: commentText })
            });

            if (!res.ok) throw new Error('Comment failed.');
            const newComment = await res.json();
            
            // Add comment locally to setups data
            if (!setup.comments) setup.comments = [];
            setup.comments.push(newComment);

            // Re-render only comment previews under this card
            const updatedRecentComments = [...setup.comments].sort((a,b) => new Date(a.created_at) - new Date(b.created_at)).slice(-2);
            const updatedCommentsCount = setup.comments.length;
            
            commentsPreviewContainer.innerHTML = `
              ${updatedCommentsCount > 2 ? `<span class="view-all-comments-btn" onclick="window.location.hash='#/setup/${setup.id}'">View all ${updatedCommentsCount} comments</span>` : ''}
              ${updatedRecentComments.map(c => `
                <div class="inline-comment-item">
                  <span class="inline-comment-username" onclick="window.location.hash='#/profile/${encodeURIComponent(c.username)}'">${escapeHTML(c.username)}</span>
                  <span>${escapeHTML(c.text)}</span>
                </div>
              `).join('')}
            `;
            
            inlineCommentInput.value = '';
            showToast('Comment posted!');
          } catch (err) {
            console.error(err);
            showToast('Failed to post comment.', 'error');
          } finally {
            submitBtn.disabled = false;
          }
        });

        setupCardsGrid.appendChild(card);
      });
    }
  }

  async function handleLike(setupId, buttonEl, countEl) {
    const isLiked = hasLiked(setupId);
    const apiEndpoint = isLiked ? `/api/setups/${setupId}/unlike` : `/api/setups/${setupId}/like`;

    try {
      buttonEl.disabled = true;
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username: getOrGenerateUsername() })
      });

      if (!response.ok) {
        throw new Error(isLiked ? 'Retracting like failed.' : 'Liking failed.');
      }

      const updatedSetup = await response.json();
      countEl.textContent = updatedSetup.likes;

      if (isLiked) {
        removeLike(setupId);
        buttonEl.classList.remove('liked');
        if (buttonEl.classList.contains('social-action-icon-btn')) {
          buttonEl.innerHTML = '<i class="fa-regular fa-heart"></i>';
        } else {
          buttonEl.innerHTML = '<i class="fa-solid fa-heart"></i> Like';
        }
      } else {
        recordLike(setupId);
        buttonEl.classList.add('liked');
        if (buttonEl.classList.contains('social-action-icon-btn')) {
          buttonEl.innerHTML = '<i class="fa-solid fa-heart"></i>';
        } else {
          buttonEl.innerHTML = '<i class="fa-solid fa-heart"></i> Liked';
        }
      }
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Failed to complete action. Try again.', 'error');
    } finally {
      buttonEl.disabled = false;
    }
  }

  // Sort drop down change
  feedSort.addEventListener('change', (e) => {
    state.sortBy = e.target.value;
    loadFeed();
  });

  // Layout switcher click handlers
  if (btnSwitchFeed && btnSwitchGrid) {
    btnSwitchFeed.addEventListener('click', () => {
      if (state.feedLayout === 'feed') return;
      state.feedLayout = 'feed';
      btnSwitchFeed.classList.add('active');
      btnSwitchGrid.classList.remove('active');
      loadFeed();
    });

    btnSwitchGrid.addEventListener('click', () => {
      if (state.feedLayout === 'grid') return;
      state.feedLayout = 'grid';
      btnSwitchGrid.classList.add('active');
      btnSwitchFeed.classList.remove('active');
      loadFeed();
    });
  }

  // Category filter click
  categoriesContainer.addEventListener('click', (e) => {
    const chip = e.target.closest('.filter-chip');
    if (!chip) return;

    // Update active UI state
    document.querySelectorAll('.filter-chip').forEach(btn => btn.classList.remove('active'));
    chip.classList.add('active');

    state.activeCategory = chip.dataset.category;
    loadFeed();
  });

  // ==============================================
  // UPLOAD FORM PAGE LOGIC
  // ==============================================
  
  // Character counter for description
  setupDescription.addEventListener('input', (e) => {
    charCount.textContent = e.target.value.length;
  });

  // Drag and drop event listeners
  ['dragenter', 'dragover'].forEach(eventName => {
    fileDropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      fileDropzone.classList.add('dragover');
    }, false);
  });

  ['dragleave', 'drop'].forEach(eventName => {
    fileDropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      fileDropzone.classList.remove('dragover');
    }, false);
  });

  fileDropzone.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    const files = dt.files;
    if (files.length) {
      setupImageInput.files = files;
      handleImageSelection(files[0]);
    }
  });

  setupImageInput.addEventListener('change', (e) => {
    if (e.target.files.length) {
      handleImageSelection(e.target.files[0]);
    }
  });



  function getViewportRect(ratioStr, img, canvasW, canvasH) {
    let r = 1;
    if (ratioStr === 'original') {
      r = img ? img.width / img.height : 4 / 3;
    } else if (ratioStr === '1:1') {
      r = 1;
    } else if (ratioStr === '16:9') {
      r = 16 / 9;
    } else if (ratioStr === '4:5') {
      r = 4 / 5;
    }
    
    const padding = 20;
    const maxW = canvasW - padding * 2;
    const maxH = canvasH - padding * 2;
    
    let w = maxW;
    let h = w / r;
    if (h > maxH) {
      h = maxH;
      w = h * r;
    }
    
    return {
      x: (canvasW - w) / 2,
      y: (canvasH - h) / 2,
      w: w,
      h: h
    };
  }

  function initUploadCropper(img) {
    uploadImg = img;
    uploadActiveRatio = 'original';
    
    // Set active ratio chip
    document.querySelectorAll('.aspect-chip').forEach(btn => {
      if (btn.dataset.ratio === 'original') {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    let canvas = document.getElementById('setup-upload-canvas');
    let ctx = canvas.getContext('2d');
    const zoomSlider = document.getElementById('setup-upload-zoom');

    canvas.width = 480;
    canvas.height = 360;

    let rect = getViewportRect(uploadActiveRatio, img, canvas.width, canvas.height);
    const minZoom = Math.max(rect.w / img.width, rect.h / img.height);
    uploadZoom = minZoom;
    
    zoomSlider.min = minZoom;
    zoomSlider.max = minZoom * 4;
    zoomSlider.value = uploadZoom;
    zoomSlider.step = (minZoom * 3) / 100;

    uploadImgX = canvas.width / 2;
    uploadImgY = canvas.height / 2;

    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const w = img.width * uploadZoom;
      const h = img.height * uploadZoom;
      const dx = uploadImgX - w / 2;
      const dy = uploadImgY - h / 2;
      
      ctx.save();
      ctx.drawImage(img, dx, dy, w, h);
      ctx.restore();
      
      const vRect = getViewportRect(uploadActiveRatio, img, canvas.width, canvas.height);
      
      ctx.save();
      ctx.fillStyle = 'rgba(7, 8, 10, 0.75)';
      // Top overlay
      ctx.fillRect(0, 0, canvas.width, vRect.y);
      // Bottom overlay
      ctx.fillRect(0, vRect.y + vRect.h, canvas.width, canvas.height - (vRect.y + vRect.h));
      // Left overlay
      ctx.fillRect(0, vRect.y, vRect.x, vRect.h);
      // Right overlay
      ctx.fillRect(vRect.x + vRect.w, vRect.y, canvas.width - (vRect.x + vRect.w), vRect.h);
      
      // Viewport border
      ctx.strokeStyle = 'var(--accent-purple)';
      ctx.lineWidth = 2;
      ctx.strokeRect(vRect.x, vRect.y, vRect.w, vRect.h);
      ctx.restore();
    }

    function getMousePos(e) {
      const cRect = canvas.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      return {
        x: (clientX - cRect.left) * (canvas.width / cRect.width),
        y: (clientY - cRect.top) * (canvas.height / cRect.height)
      };
    }

    function startDrag(e) {
      uploadIsDragging = true;
      const pos = getMousePos(e);
      uploadStartX = pos.x - uploadImgX;
      uploadStartY = pos.y - uploadImgY;
      if (e.cancelable) e.preventDefault();
    }

    function drag(e) {
      if (!uploadIsDragging) return;
      const pos = getMousePos(e);
      let targetX = pos.x - uploadStartX;
      let targetY = pos.y - uploadStartY;

      const vRect = getViewportRect(uploadActiveRatio, img, canvas.width, canvas.height);
      const w = img.width * uploadZoom;
      const h = img.height * uploadZoom;

      if (w >= vRect.w) {
        if (targetX - w / 2 > vRect.x) targetX = vRect.x + w / 2;
        if (targetX + w / 2 < vRect.x + vRect.w) targetX = vRect.x + vRect.w - w / 2;
      } else {
        targetX = canvas.width / 2;
      }

      if (h >= vRect.h) {
        if (targetY - h / 2 > vRect.y) targetY = vRect.y + h / 2;
        if (targetY + h / 2 < vRect.y + vRect.h) targetY = vRect.y + vRect.h - h / 2;
      } else {
        targetY = canvas.height / 2;
      }

      uploadImgX = targetX;
      uploadImgY = targetY;
      draw();
    }

    function stopDrag() {
      uploadIsDragging = false;
    }

    // Clone canvas to clear old listeners
    const newCanvas = canvas.cloneNode(true);
    canvas.parentNode.replaceChild(newCanvas, canvas);
    canvas = newCanvas;
    canvas.width = 480;
    canvas.height = 360;
    ctx = canvas.getContext('2d');

    canvas.addEventListener('mousedown', startDrag);
    canvas.addEventListener('mousemove', drag);
    window.addEventListener('mouseup', stopDrag);

    canvas.addEventListener('touchstart', startDrag, { passive: false });
    canvas.addEventListener('touchmove', drag, { passive: false });
    window.addEventListener('touchend', stopDrag);

    // Zoom slider event
    const newZoomSlider = zoomSlider.cloneNode(true);
    zoomSlider.parentNode.replaceChild(newZoomSlider, zoomSlider);
    
    newZoomSlider.addEventListener('input', (e) => {
      uploadZoom = parseFloat(e.target.value);
      
      const vRect = getViewportRect(uploadActiveRatio, img, canvas.width, canvas.height);
      const w = img.width * uploadZoom;
      const h = img.height * uploadZoom;

      if (w >= vRect.w) {
        if (uploadImgX - w / 2 > vRect.x) uploadImgX = vRect.x + w / 2;
        if (uploadImgX + w / 2 < vRect.x + vRect.w) uploadImgX = vRect.x + vRect.w - w / 2;
      } else {
        uploadImgX = canvas.width / 2;
      }

      if (h >= vRect.h) {
        if (uploadImgY - h / 2 > vRect.y) uploadImgY = vRect.y + h / 2;
        if (uploadImgY + h / 2 < vRect.y + vRect.h) uploadImgY = vRect.y + vRect.h - h / 2;
      } else {
        uploadImgY = canvas.height / 2;
      }

      draw();
    });

    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.05 : 0.95;
      const nextZoom = Math.max(parseFloat(newZoomSlider.min), Math.min(parseFloat(newZoomSlider.max), uploadZoom * factor));
      newZoomSlider.value = nextZoom;
      newZoomSlider.dispatchEvent(new Event('input'));
    }, { passive: false });

    // Handle aspect ratio chips clicking
    const aspectContainer = document.querySelector('.aspect-ratio-selector');
    const newAspectContainer = aspectContainer.cloneNode(true);
    aspectContainer.parentNode.replaceChild(newAspectContainer, aspectContainer);

    newAspectContainer.addEventListener('click', (e) => {
      const chip = e.target.closest('.aspect-chip');
      if (!chip) return;

      newAspectContainer.querySelectorAll('.aspect-chip').forEach(btn => btn.classList.remove('active'));
      chip.classList.add('active');

      uploadActiveRatio = chip.dataset.ratio;

      const vRect = getViewportRect(uploadActiveRatio, img, canvas.width, canvas.height);
      const newMinZoom = Math.max(vRect.w / img.width, vRect.h / img.height);
      
      newZoomSlider.min = newMinZoom;
      newZoomSlider.max = newMinZoom * 4;
      if (uploadZoom < newMinZoom) {
        uploadZoom = newMinZoom;
      }
      newZoomSlider.value = uploadZoom;
      newZoomSlider.step = (newMinZoom * 3) / 100;

      const w = img.width * uploadZoom;
      const h = img.height * uploadZoom;

      if (w >= vRect.w) {
        if (uploadImgX - w / 2 > vRect.x) uploadImgX = vRect.x + w / 2;
        if (uploadImgX + w / 2 < vRect.x + vRect.w) uploadImgX = vRect.x + vRect.w - w / 2;
      } else {
        uploadImgX = canvas.width / 2;
      }

      if (h >= vRect.h) {
        if (uploadImgY - h / 2 > vRect.y) uploadImgY = vRect.y + h / 2;
        if (uploadImgY + h / 2 < vRect.y + vRect.h) uploadImgY = vRect.y + vRect.h - h / 2;
      } else {
        uploadImgY = canvas.height / 2;
      }

      draw();
    });

    draw();
  }

  function getCroppedSetupBlob() {
    return new Promise((resolve) => {
      if (!uploadImg) {
        resolve(null);
        return;
      }

      const canvas = document.getElementById('setup-upload-canvas');
      const vRect = getViewportRect(uploadActiveRatio, uploadImg, canvas.width, canvas.height);
      const w = uploadImg.width * uploadZoom;
      const h = uploadImg.height * uploadZoom;
      const dx = uploadImgX - w / 2;
      const dy = uploadImgY - h / 2;

      const srcX = Math.round((vRect.x - dx) / uploadZoom);
      const srcY = Math.round((vRect.y - dy) / uploadZoom);
      const srcW = Math.round(vRect.w / uploadZoom);
      const srcH = Math.round(vRect.h / uploadZoom);

      const outputCanvas = document.createElement('canvas');
      outputCanvas.width = srcW;
      outputCanvas.height = srcH;
      const oCtx = outputCanvas.getContext('2d');
      oCtx.drawImage(uploadImg, srcX, srcY, srcW, srcH, 0, 0, srcW, srcH);

      outputCanvas.toBlob((blob) => {
        resolve(blob);
      }, 'image/jpeg', 0.92);
    });
  }

  function handleImageSelection(file) {
    errors.image.textContent = '';
    state.selectedFile = null;

    // Validations
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    const maxSizeBytes = 10 * 1024 * 1024; // 10MB

    const filename = file.name.toLowerCase();
    const isAllowedExt = filename.endsWith('.jpg') || filename.endsWith('.jpeg') || filename.endsWith('.png') || filename.endsWith('.webp');
    const isAllowedType = allowedTypes.includes(file.type) || (file.type === '' && isAllowedExt) || isAllowedExt;

    if (!isAllowedType) {
      errors.image.textContent = 'Only JPG, PNG and WEBP file formats are supported.';
      setupImageInput.value = '';
      return;
    }

    if (file.size > maxSizeBytes) {
      errors.image.textContent = 'Image is too large. Max file size is 10 MB.';
      setupImageInput.value = '';
      return;
    }

    state.selectedFile = file;
    
    // Show image preview and init cropper
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        uploadPrompt.classList.add('hidden');
        uploadPreviewContainer.classList.remove('hidden');
        const toolsBar = document.getElementById('upload-tools-bar');
        if (toolsBar) toolsBar.classList.remove('hidden');
        initUploadCropper(img);
      };
      img.onerror = () => {
        errors.image.textContent = 'Failed to load image preview.';
        setupImageInput.value = '';
      };
      img.src = e.target.result;
    };
    reader.onerror = () => {
      errors.image.textContent = 'Error reading file.';
      setupImageInput.value = '';
    };
    reader.readAsDataURL(file);
  }

  btnRemovePreview.addEventListener('click', (e) => {
    e.preventDefault();
    clearImageSelection();
  });

  function clearImageSelection() {
    setupImageInput.value = '';
    state.selectedFile = null;
    uploadImg = null;
    const canvas = document.getElementById('setup-upload-canvas');
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    uploadPreviewContainer.classList.add('hidden');
    uploadPrompt.classList.remove('hidden');
    const toolsBar = document.getElementById('upload-tools-bar');
    if (toolsBar) toolsBar.classList.add('hidden');
    errors.image.textContent = '';
  }

  function resetUploadForm() {
    uploadForm.reset();
    clearImageSelection();
    charCount.textContent = '0';
    // Clear validation errors
    Object.values(errors).forEach(err => {
      if (err) err.textContent = '';
    });
  }

  // Upload Form Submission
  uploadForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Clear previous errors
    Object.values(errors).forEach(err => {
      if (err) err.textContent = '';
    });

    let isValid = true;

    // Validate fields
    const titleVal = setupTitle.value.trim();
    const categoryVal = setupCategory.value;
    const visibilityVal = setupVisibility.value;

    if (!titleVal) {
      errors.title.textContent = 'Title is required.';
      isValid = false;
    }
    if (!categoryVal) {
      errors.category.textContent = 'Please select a setup category.';
      isValid = false;
    }
    if (!state.selectedFile || !uploadImg) {
      errors.image.textContent = 'Please select and upload your image.';
      isValid = false;
    }

    if (!isValid) {
      showToast('Please fix validation errors before submitting.', 'error');
      return;
    }

    const submitBtn = document.getElementById('btn-submit-upload');
    const originalBtnHTML = submitBtn.innerHTML;
    
    try {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<div class="loading-spinner" style="width:16px;height:16px;border-width:2px;display:inline-block;vertical-align:middle;margin-right:8px;"></div> Uploading post...';

      // Get cropped blob from cropper canvas
      const croppedBlob = await getCroppedSetupBlob();
      if (!croppedBlob) {
        throw new Error('Failed to generate cropped image.');
      }

      // Submit form data
      const formData = new FormData();
      formData.append('title', titleVal);
      formData.append('username', getOrGenerateUsername());
      formData.append('category', categoryVal);
      formData.append('private', visibilityVal === 'private' ? 'true' : 'false');
      formData.append('description', setupDescription.value.trim());
      formData.append('image', croppedBlob, 'setup.jpg');
      
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Server error uploading post.');
      }

      showToast('Post uploaded successfully! Redirecting to feed...');
      resetUploadForm();
      
      // Delay redirect slightly so user can read toast
      setTimeout(() => {
        window.location.hash = '#/';
      }, 1000);
      
    } catch (err) {
      console.error(err);
      errors.general.textContent = err.message || 'Network error occurred during submission.';
      showToast(err.message || 'Upload failed.', 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalBtnHTML;
    }
  });

  // ==============================================
  // LEADERBOARD PAGE LOGIC
  // ==============================================
  async function loadLeaderboard() {
    const podiumContainer = document.getElementById('podium-container');
    const listBody = document.getElementById('leaderboard-list-body');
    const countText = document.getElementById('leaderboard-count');

    podiumContainer.innerHTML = `
      <div class="loading-spinner-container">
        <div class="loading-spinner"></div>
        <p>Loading leaderboard podium...</p>
      </div>
    `;
    listBody.innerHTML = '';
    countText.textContent = 'Loading rankings...';

    try {
      const response = await fetch('/api/setups?sort=votes');
      if (!response.ok) {
        throw new Error('Leaderboard load failed.');
      }

      const setups = await response.json();
      countText.textContent = `${setups.length} setups ranked`;
      renderLeaderboard(setups);
    } catch (err) {
      console.error(err);
      podiumContainer.innerHTML = '';
      showToast('Failed to load leaderboard data.', 'error');
    }
  }

  function renderLeaderboard(setups) {
    const podiumContainer = document.getElementById('podium-container');
    const listBody = document.getElementById('leaderboard-list-body');

    podiumContainer.innerHTML = '';
    listBody.innerHTML = '';

    if (setups.length === 0) {
      podiumContainer.innerHTML = `
        <div style="text-align:center;color:var(--text-muted);grid-column:1/-1;">
          <p>No setups uploaded yet to rank.</p>
        </div>
      `;
      return;
    }

    // Split into top 3 and the rest
    const top3 = setups.slice(0, 3);
    const rest = setups.slice(3);

    // Render podium spots
    // We order top 3 dynamically: Index 1 (2nd place) on left, Index 0 (1st place) in center, Index 2 (3rd place) on right.
    const podiumSpotsConfig = [
      { index: 1, class: 'second', rank: 2, label: '2nd' },
      { index: 0, class: 'first', rank: 1, label: '1st' },
      { index: 2, class: 'third', rank: 3, label: '3rd' }
    ];

    podiumSpotsConfig.forEach(spot => {
      const setup = top3[spot.index];
      
      // If we don't have enough setups, render an empty/placeholder spot
      if (!setup) {
        const placeholder = document.createElement('div');
        placeholder.className = `podium-spot ${spot.class}`;
        placeholder.innerHTML = `
          <div class="podium-avatar-wrapper" style="opacity: 0.15">
            <div class="podium-avatar" style="border: 2px dashed var(--text-muted); background: var(--bg-tertiary);"></div>
            <div class="podium-number-badge">${spot.rank}</div>
          </div>
          <div class="podium-user-info">
            <h4 class="podium-title" style="cursor:default">Vacant</h4>
            <span class="podium-username">-</span>
          </div>
          <div class="podium-pedestal">
            <span class="podium-votes">0</span>
            <span class="podium-votes-label">Votes</span>
          </div>
        `;
        podiumContainer.appendChild(placeholder);
        return;
      }

      const spotEl = document.createElement('div');
      spotEl.className = `podium-spot ${spot.class}`;
      
      const crown = spot.rank === 1 ? '<div class="podium-crown"><i class="fa-solid fa-crown"></i></div>' : '';

      spotEl.innerHTML = `
        <div class="podium-avatar-wrapper">
          ${crown}
          <img src="${setup.image_url}" alt="${setup.title}" class="podium-avatar" onclick="window.location.hash = '#/setup/${setup.id}'">
          <div class="podium-number-badge">${spot.rank}</div>
        </div>
        <div class="podium-user-info">
          <h4 class="podium-title" onclick="window.location.hash = '#/setup/${setup.id}'">${escapeHTML(setup.title)}</h4>
          <span class="podium-username"><i class="fa-solid fa-user-astronaut"></i> ${escapeHTML(setup.username)}</span>
        </div>
        <div class="podium-pedestal">
          <span class="podium-votes">${setup.votes}</span>
          <span class="podium-votes-label">Votes</span>
        </div>
      `;
      podiumContainer.appendChild(spotEl);
    });

    // Render list table rows for indices >= 3
    if (rest.length === 0) {
      const emptyRow = document.createElement('div');
      emptyRow.className = 'table-row';
      emptyRow.style.justifyContent = 'center';
      emptyRow.style.color = 'var(--text-muted)';
      emptyRow.style.fontSize = '13px';
      emptyRow.innerHTML = 'No other setups ranked yet.';
      listBody.appendChild(emptyRow);
      return;
    }

    rest.forEach((setup, idx) => {
      const rank = idx + 4; // Index offset by 4 (since top 3 are podium)
      const row = document.createElement('div');
      row.className = 'table-row';
      
      row.innerHTML = `
        <div class="col-rank row-rank">${rank}</div>
        <div class="col-setup row-setup">
          <img src="${setup.image_url}" alt="${setup.title}" class="row-thumbnail" onclick="window.location.hash = '#/setup/${setup.id}'">
          <span class="row-setup-title" onclick="window.location.hash = '#/setup/${setup.id}'">${escapeHTML(setup.title)}</span>
        </div>
        <div class="col-author row-author">
          <i class="fa-solid fa-user-astronaut"></i> ${escapeHTML(setup.username)}
        </div>
        <div class="col-category">
          <span class="row-category-badge">${setup.category}</span>
        </div>
        <div class="col-votes row-votes">
          <i class="fa-solid fa-heart"></i> ${setup.votes}
        </div>
      `;
      listBody.appendChild(row);
    });
  }

  // ==============================================
  // SETUP DETAILS PAGE LOGIC
  // ==============================================
  async function loadDetail(setupId) {
    const container = document.getElementById('detail-container');
    container.innerHTML = `
      <div class="loading-spinner-container">
        <div class="loading-spinner"></div>
        <p>Loading details...</p>
      </div>
    `;

    try {
      await fetchProfiles();
      const viewer = getOrGenerateUsername();
      const response = await fetch(`/api/setups/${setupId}?username=${encodeURIComponent(viewer)}&t=${Date.now()}`);
      if (!response.ok) {
        throw new Error('Post not found.');
      }

      const setup = await response.json();
      renderDetail(setup);
    } catch (err) {
      console.error(err);
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon" style="color:#ef4444"><i class="fa-solid fa-triangle-exclamation"></i></div>
          <h3>Post Not Found</h3>
          <p>The post you are trying to view does not exist or has been removed.</p>
          <a href="#/" class="secondary-btn"><i class="fa-solid fa-arrow-left"></i> Back to Feed</a>
        </div>
      `;
      showToast('Failed to load details.', 'error');
    }
  }

  function renderCommentsList(comments, setupHost) {
    if (!comments || comments.length === 0) {
      return `<div class="no-comments-msg">No comments yet. Be the first to share your thoughts!</div>`;
    }
    
    const currentUsername = getOrGenerateUsername().trim().toLowerCase();
    const hostUsername = (setupHost || '').trim().toLowerCase();

    // Sort comments: newest first
    const sorted = [...comments].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    return sorted.map(c => {
      const commentDate = new Date(c.created_at);
      const timeStr = commentDate.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      
      const userProfile = state.profiles[c.username.toLowerCase()];
      const avatarHTML = (userProfile && userProfile.avatar_url)
        ? `<img src="${userProfile.avatar_url}" class="comment-author-avatar-tiny" alt="${c.username}" style="width: 20px; height: 20px; border-radius: 50%; object-fit: cover; border: 1px solid var(--border-color);">`
        : `<span class="comment-author-avatar-initials-tiny" style="width: 20px; height: 20px; border-radius: 50%; background: var(--bg-tertiary); color: var(--text-muted); font-size: 9px; font-weight: 700; display: flex; align-items: center; justify-content: center; border: 1px solid var(--border-color);">${c.username.slice(0, 2).toUpperCase()}</span>`;

      // Check authorization
      const commentAuthor = c.username.trim().toLowerCase();
      const isCommentAuthor = commentAuthor === currentUsername;
      const isHost = hostUsername === currentUsername;

      // Render replies HTML
      const replies = c.replies || [];
      const repliesHTML = replies.map(r => {
        const replyDate = new Date(r.created_at);
        const rTimeStr = replyDate.toLocaleString(undefined, {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
        
        const rProfile = state.profiles[r.username.toLowerCase()];
        const rAvatarHTML = (rProfile && rProfile.avatar_url)
          ? `<img src="${rProfile.avatar_url}" class="comment-author-avatar-tiny" alt="${r.username}" style="width: 18px; height: 18px; border-radius: 50%; object-fit: cover; border: 1px solid var(--border-color);">`
          : `<span class="comment-author-avatar-initials-tiny" style="width: 18px; height: 18px; border-radius: 50%; background: var(--bg-tertiary); color: var(--text-muted); font-size: 8px; font-weight: 700; display: flex; align-items: center; justify-content: center; border: 1px solid var(--border-color);">${r.username.slice(0, 2).toUpperCase()}</span>`;

        const replyAuthor = r.username.trim().toLowerCase();
        const isReplyAuthor = replyAuthor === currentUsername;

        return `
          <div class="reply-item" id="reply-${r.id}">
            <div class="comment-item-header">
              <span class="comment-author profile-link-span" style="display: flex; align-items: center; gap: 6px; font-size:12.5px;" onclick="window.location.hash = '#/profile/${encodeURIComponent(r.username)}'">${rAvatarHTML} ${escapeHTML(r.username)}</span>
              <span class="comment-time" style="font-size:10px;">${rTimeStr}</span>
            </div>
            <div class="comment-body-wrapper" id="reply-body-${r.id}" style="margin-left: 24px;">
              <p class="comment-text-content" style="font-size:13px;">${escapeHTML(r.text)}</p>
              
              <!-- Reply action buttons -->
              <div class="comment-actions-row">
                ${isReplyAuthor ? `<span class="comment-action-link edit-reply-btn" data-comment-id="${c.id}" data-reply-id="${r.id}"><i class="fa-solid fa-pen"></i> Edit</span>` : ''}
                ${(isReplyAuthor || isCommentAuthor || isHost) ? `<span class="comment-action-link delete-reply-btn" data-comment-id="${c.id}" data-reply-id="${r.id}"><i class="fa-solid fa-trash"></i> Delete</span>` : ''}
              </div>
            </div>
          </div>
        `;
      }).join('');

      return `
        <div class="comment-item" id="comment-${c.id}">
          <div class="comment-item-header">
            <span class="comment-author profile-link-span" style="display: flex; align-items: center; gap: 8px;" onclick="window.location.hash = '#/profile/${encodeURIComponent(c.username)}'">${avatarHTML} ${escapeHTML(c.username)}</span>
            <span class="comment-time">${timeStr}</span>
          </div>
          
          <div class="comment-body-wrapper" id="comment-body-${c.id}" style="margin-left: 28px;">
            <p class="comment-text-content">${escapeHTML(c.text)}</p>
            
            <!-- Comment action buttons -->
            <div class="comment-actions-row">
              <span class="comment-action-link reply-trigger-btn" data-comment-id="${c.id}" data-username="${c.username}"><i class="fa-solid fa-reply"></i> Reply</span>
              ${isCommentAuthor ? `<span class="comment-action-link edit-comment-btn" data-comment-id="${c.id}"><i class="fa-solid fa-pen"></i> Edit</span>` : ''}
              ${(isCommentAuthor || isHost) ? `<span class="comment-action-link delete-comment-btn" data-comment-id="${c.id}"><i class="fa-solid fa-trash"></i> Delete</span>` : ''}
            </div>
          </div>

          <!-- Hidden inline reply form -->
          <div class="inline-reply-form-wrapper hidden" id="reply-form-wrapper-${c.id}">
            <form class="inline-reply-form" data-comment-id="${c.id}">
              <input type="text" class="inline-reply-input" placeholder="Reply to ${escapeHTML(c.username)}..." required maxlength="200">
              <div class="inline-reply-buttons">
                <button type="button" class="secondary-btn btn-cancel-reply" data-comment-id="${c.id}">Cancel</button>
                <button type="submit" class="primary-btn btn-post-reply">Post</button>
              </div>
            </form>
          </div>

          <!-- Replies list container -->
          <div class="replies-container ${replies.length === 0 ? 'hidden' : ''}">
            ${repliesHTML}
          </div>
        </div>
      `;
    }).join('');
  }

  function renderDetail(setup) {
    const container = document.getElementById('detail-container');
    const liked = hasLiked(setup.id);
    
    // Formatting date
    const uploadDate = new Date(setup.created_at);
    const dateStr = uploadDate.toLocaleDateString(undefined, { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });

    let currentUsername = getOrGenerateUsername();

    // Populate detail page layout with Comments Section (No edit button beside commenter alias)
    container.innerHTML = `
      <!-- Back Navigation & Title -->
      <div class="detail-header-wrapper">
        <a href="#/" class="back-link"><i class="fa-solid fa-arrow-left"></i> Back to Feed</a>
        <div class="detail-title-row" style="display:flex; justify-content:space-between; align-items:center; margin-top:8px;">
          <h1 class="detail-title" style="display:flex; align-items:center; gap:8px; margin:0;">
            ${escapeHTML(setup.title)}
            ${setup.private ? '<i class="fa-solid fa-lock" title="Private Post" style="color: var(--accent-pink); font-size: 16px;"></i>' : ''}
          </h1>
          <button class="post-options-btn-lg" id="detail-options-btn" data-id="${setup.id}" title="Options" style="background:rgba(255,255,255,0.04); border:1px solid var(--border-color); color:var(--text-muted); cursor:pointer; font-size:16px; width:36px; height:36px; border-radius:50%; display:flex; align-items:center; justify-content:center; transition:var(--transition-fast);"><i class="fa-solid fa-ellipsis"></i></button>
        </div>
        <div class="detail-metadata-bar">
          <span class="meta-item detail-tag">${setup.category}</span>
          <span class="meta-item"><i class="fa-solid fa-user-astronaut"></i> Uploaded by <strong class="profile-link-span" onclick="window.location.hash = '#/profile/${encodeURIComponent(setup.username)}'">${escapeHTML(setup.username)}</strong></span>
          <span class="meta-item"><i class="fa-solid fa-calendar-day"></i> Added on ${dateStr}</span>
        </div>
      </div>

      <!-- Main Showcase Setup Image -->
      <div class="detail-img-card">
        <img src="${setup.image_url}" alt="${setup.title}" class="detail-img">
      </div>

      <!-- Detail Page Content Layout -->
      <div class="detail-grid">
        <!-- Left Side: Description & Comments -->
        <div class="detail-left-col">
          <div class="detail-description">
            <h3>Description & Details</h3>
            <p>${setup.description ? escapeHTML(setup.description) : 'No description provided.'}</p>
          </div>

          <!-- Comments Section -->
          <div class="comments-section-card">
            <h3 class="comments-title"><i class="fa-regular fa-comments"></i> Comments (<span id="comments-count">${setup.comments ? setup.comments.length : 0}</span>)</h3>
            
            <!-- Add Comment Form -->
            <form id="comment-form" class="comment-form">
              <div class="comment-author-badge">
                <span class="posting-as-text">Posting as: <strong id="display-username" class="username-highlight profile-link-span" onclick="window.location.hash = '#/profile/${encodeURIComponent(currentUsername)}'" title="View Profile">${escapeHTML(currentUsername)}</strong></span>
              </div>
              <div class="comment-text-row">
                <textarea id="comment-text" class="form-control textarea" placeholder="Add a comment..." maxlength="200" required></textarea>
              </div>
              <div class="comment-submit-row">
                <button type="submit" class="comment-submit-btn primary-btn" id="btn-submit-comment">
                  <i class="fa-solid fa-paper-plane"></i> Post Comment
                </button>
              </div>
            </form>

            <!-- Comments List -->
            <div class="comments-list" id="comments-list">
              ${renderCommentsList(setup.comments, setup.username)}
            </div>
          </div>
        </div>

        <!-- Right Side: Sidebar Actions -->
        <div class="detail-right-col">
          <div class="detail-actions-panel">
            <div class="actions-header">
              <h4>Post Standing</h4>
              <div class="actions-likes-large" id="detail-likes-display">
                <i class="fa-solid fa-heart"></i> <span id="detail-likes-num">${setup.likes}</span>
              </div>
            </div>
            
            <button class="detail-like-btn primary-btn ${liked ? 'liked' : ''}" id="detail-like-btn">
              ${liked ? '<i class="fa-solid fa-heart"></i> Liked' : '<i class="fa-solid fa-heart"></i> Like'}
            </button>
            
            <button class="detail-share-btn secondary-btn" id="detail-share-btn">
              <i class="fa-solid fa-share-nodes"></i> Share Post
            </button>
          </div>
        </div>
      </div>
    `;

    // Hook up options button
    const detailOptionsBtn = document.getElementById('detail-options-btn');
    if (detailOptionsBtn) {
      detailOptionsBtn.addEventListener('click', () => {
        openPostOptionsModal(setup);
      });
    }

    // Hook up detail page likes display click to open modal
    const detailLikesDisplay = document.getElementById('detail-likes-display');
    if (detailLikesDisplay) {
      detailLikesDisplay.addEventListener('click', () => {
        openLikesModal(setup.id);
      });
    }

    // Hook up details page like button
    const detailLikeBtn = document.getElementById('detail-like-btn');
    const detailLikesNum = document.getElementById('detail-likes-num');
    
    detailLikeBtn.addEventListener('click', async () => {
      const isLiked = hasLiked(setup.id);
      const apiEndpoint = isLiked ? `/api/setups/${setup.id}/unlike` : `/api/setups/${setup.id}/like`;

      try {
        detailLikeBtn.disabled = true;
        const response = await fetch(apiEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ username: currentUsername })
        });

        if (!response.ok) {
          throw new Error(isLiked ? 'Retracting like failed.' : 'Like failed.');
        }

        const updatedSetup = await response.json();
        detailLikesNum.textContent = updatedSetup.likes;
        
        if (isLiked) {
          removeLike(setup.id);
          detailLikeBtn.classList.remove('liked');
          detailLikeBtn.innerHTML = '<i class="fa-solid fa-heart"></i> Like';
        } else {
          recordLike(setup.id);
          detailLikeBtn.classList.add('liked');
          detailLikeBtn.innerHTML = '<i class="fa-solid fa-heart"></i> Liked';
        }
      } catch (err) {
        console.error(err);
        showToast(err.message || 'Failed to complete action. Try again.', 'error');
      } finally {
        detailLikeBtn.disabled = false;
      }
    });

    // Hook up share button
    const detailShareBtn = document.getElementById('detail-share-btn');
    detailShareBtn.addEventListener('click', () => {
      const shareUrl = `${window.location.origin}${window.location.pathname}#/setup/${setup.id}`;
      
      navigator.clipboard.writeText(shareUrl)
        .then(() => {
          showToast('Share link copied to clipboard!');
        })
        .catch(err => {
          console.error('Clipboard copy failed:', err);
          // Fallback if clipboard API blocked
          const dummy = document.createElement('input');
          document.body.appendChild(dummy);
          dummy.value = shareUrl;
          dummy.select();
          document.execCommand('copy');
          document.body.removeChild(dummy);
          showToast('Share link copied to clipboard!');
        });
    });

    // Hook up comment form submission
    const commentForm = document.getElementById('comment-form');
    const commentText = document.getElementById('comment-text');
    const commentsList = document.getElementById('comments-list');
    const commentsCount = document.getElementById('comments-count');

    commentForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const textVal = commentText.value.trim();

      if (!textVal) {
        showToast('Comment text cannot be blank.', 'error');
        return;
      }

      const submitBtn = document.getElementById('btn-submit-comment');
      const originalHTML = submitBtn.innerHTML;

      try {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<div class="loading-spinner" style="width:12px;height:12px;border-width:2px;display:inline-block;vertical-align:middle;"></div>';

        const response = await fetch(`/api/setups/${setup.id}/comments`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ username: currentUsername, text: textVal })
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || 'Failed to submit comment.');
        }

        const newComment = await response.json();

        // Update local memory and re-render comment elements
        if (!setup.comments) setup.comments = [];
        setup.comments.push(newComment);

        commentsList.innerHTML = renderCommentsList(setup.comments, setup.username);
        commentsCount.textContent = getTotalCommentsCount(setup);

        // Clear only comment content textarea
        commentText.value = '';
        showToast('Comment posted!');
      } catch (err) {
        console.error(err);
        showToast(err.message || 'Comment failed to submit.', 'error');
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalHTML;
      }
    });

    // Event delegation on comments list (Reply triggers, Edit triggers, Delete triggers, Cancel buttons)
    commentsList.addEventListener('click', async (e) => {
      const target = e.target;

      // 1. Click Reply Trigger
      if (target.closest('.reply-trigger-btn')) {
        const btn = target.closest('.reply-trigger-btn');
        const commentId = btn.dataset.commentId;
        const author = btn.dataset.username;
        const formWrapper = document.getElementById(`reply-form-wrapper-${commentId}`);
        if (formWrapper) {
          formWrapper.classList.toggle('hidden');
          const input = formWrapper.querySelector('.inline-reply-input');
          if (input) {
            input.value = `@${author} `;
            input.focus();
          }
        }
      }

      // 2. Click Cancel Reply Form
      if (target.closest('.btn-cancel-reply')) {
        const btn = target.closest('.btn-cancel-reply');
        const commentId = btn.dataset.commentId;
        const formWrapper = document.getElementById(`reply-form-wrapper-${commentId}`);
        if (formWrapper) {
          formWrapper.classList.add('hidden');
        }
      }

      // 3. Click Edit Comment Trigger
      if (target.closest('.edit-comment-btn')) {
        const btn = target.closest('.edit-comment-btn');
        const commentId = btn.dataset.commentId;
        const bodyWrapper = document.getElementById(`comment-body-${commentId}`);
        if (bodyWrapper) {
          const comment = setup.comments.find(c => c.id === commentId);
          if (comment) {
            const originalText = comment.text;
            bodyWrapper.innerHTML = `
              <form class="inline-edit-form" data-type="comment" data-comment-id="${commentId}">
                <textarea class="inline-edit-textarea" required style="width:100%;margin-top:6px;min-height:60px;" maxlength="200">${escapeHTML(originalText)}</textarea>
                <div class="inline-edit-buttons" style="display:flex;gap:6px;justify-content:flex-end;margin-top:6px;">
                  <button type="button" class="secondary-btn btn-cancel-edit" data-type="comment" data-comment-id="${commentId}" data-original="${escapeHTML(originalText)}" style="padding:4px 8px;font-size:11px;height:auto;">Cancel</button>
                  <button type="submit" class="primary-btn btn-save-edit" style="padding:4px 8px;font-size:11px;height:auto;">Save</button>
                </div>
              </form>
            `;
            const textarea = bodyWrapper.querySelector('.inline-edit-textarea');
            if (textarea) textarea.focus();
          }
        }
      }

      // 4. Click Cancel Edit Comment/Reply
      if (target.closest('.btn-cancel-edit')) {
        const btn = target.closest('.btn-cancel-edit');
        const type = btn.dataset.type;
        const commentId = btn.dataset.commentId;
        const originalText = btn.dataset.original;

        if (type === 'comment') {
          const bodyWrapper = document.getElementById(`comment-body-${commentId}`);
          if (bodyWrapper) {
            const commentObj = setup.comments.find(c => c.id === commentId);
            const isCommentAuthor = commentObj.username.trim().toLowerCase() === currentUsername.trim().toLowerCase();
            const isHost = setup.username.trim().toLowerCase() === currentUsername.trim().toLowerCase();

            bodyWrapper.innerHTML = `
              <p class="comment-text-content">${escapeHTML(originalText)}</p>
              <div class="comment-actions-row">
                <span class="comment-action-link reply-trigger-btn" data-comment-id="${commentId}" data-username="${commentObj.username}"><i class="fa-solid fa-reply"></i> Reply</span>
                ${isCommentAuthor ? `<span class="comment-action-link edit-comment-btn" data-comment-id="${commentId}"><i class="fa-solid fa-pen"></i> Edit</span>` : ''}
                ${(isCommentAuthor || isHost) ? `<span class="comment-action-link delete-comment-btn" data-comment-id="${commentId}"><i class="fa-solid fa-trash"></i> Delete</span>` : ''}
              </div>
            `;
          }
        } else {
          const replyId = btn.dataset.replyId;
          const bodyWrapper = document.getElementById(`reply-body-${replyId}`);
          if (bodyWrapper) {
            const commentObj = setup.comments.find(c => c.id === commentId);
            const replyObj = commentObj ? commentObj.replies.find(r => r.id === replyId) : null;
            const isReplyAuthor = replyObj && replyObj.username.trim().toLowerCase() === currentUsername.trim().toLowerCase();
            const isCommentAuthor = commentObj.username.trim().toLowerCase() === currentUsername.trim().toLowerCase();
            const isHost = setup.username.trim().toLowerCase() === currentUsername.trim().toLowerCase();

            bodyWrapper.innerHTML = `
              <p class="comment-text-content" style="font-size:13px;">${escapeHTML(originalText)}</p>
              <div class="comment-actions-row">
                ${isReplyAuthor ? `<span class="comment-action-link edit-reply-btn" data-comment-id="${commentId}" data-reply-id="${replyId}"><i class="fa-solid fa-pen"></i> Edit</span>` : ''}
                ${(isReplyAuthor || isCommentAuthor || isHost) ? `<span class="comment-action-link delete-reply-btn" data-comment-id="${commentId}" data-reply-id="${replyId}"><i class="fa-solid fa-trash"></i> Delete</span>` : ''}
              </div>
            `;
          }
        }
      }

      // 5. Click Edit Reply Trigger
      if (target.closest('.edit-reply-btn')) {
        const btn = target.closest('.edit-reply-btn');
        const commentId = btn.dataset.commentId;
        const replyId = btn.dataset.replyId;
        const bodyWrapper = document.getElementById(`reply-body-${replyId}`);
        if (bodyWrapper) {
          const comment = setup.comments.find(c => c.id === commentId);
          const reply = comment ? comment.replies.find(r => r.id === replyId) : null;
          if (reply) {
            const originalText = reply.text;
            bodyWrapper.innerHTML = `
              <form class="inline-edit-form" data-type="reply" data-comment-id="${commentId}" data-reply-id="${replyId}">
                <textarea class="inline-edit-textarea" required style="width:100%;margin-top:6px;min-height:50px;" maxlength="200">${escapeHTML(originalText)}</textarea>
                <div class="inline-edit-buttons" style="display:flex;gap:6px;justify-content:flex-end;margin-top:6px;">
                  <button type="button" class="secondary-btn btn-cancel-edit" data-type="reply" data-comment-id="${commentId}" data-reply-id="${replyId}" data-original="${escapeHTML(originalText)}" style="padding:4px 8px;font-size:11px;height:auto;">Cancel</button>
                  <button type="submit" class="primary-btn btn-save-edit" style="padding:4px 8px;font-size:11px;height:auto;">Save</button>
                </div>
              </form>
            `;
            const textarea = bodyWrapper.querySelector('.inline-edit-textarea');
            if (textarea) textarea.focus();
          }
        }
      }

      // 6. Click Delete Comment Trigger
      if (target.closest('.delete-comment-btn')) {
        const btn = target.closest('.delete-comment-btn');
        const commentId = btn.dataset.commentId;
        openDeleteCommentConfirmModal(setup.id, commentId, null);
      }

      // 7. Click Delete Reply Trigger
      if (target.closest('.delete-reply-btn')) {
        const btn = target.closest('.delete-reply-btn');
        const commentId = btn.dataset.commentId;
        const replyId = btn.dataset.replyId;
        openDeleteCommentConfirmModal(setup.id, commentId, replyId);
      }
    });

    // Form submissions delegation for replies & edits
    commentsList.addEventListener('submit', async (e) => {
      e.preventDefault();
      const form = e.target;

      // 1. Submit Inline Reply Form
      if (form.classList.contains('inline-reply-form')) {
        const commentId = form.dataset.commentId;
        const input = form.querySelector('.inline-reply-input');
        const textVal = input.value.trim();
        if (!textVal) return;

        const submitBtn = form.querySelector('.btn-post-reply');
        const originalText = submitBtn.textContent;

        try {
          submitBtn.disabled = true;
          submitBtn.textContent = '...';

          const res = await fetch(`/api/setups/${setup.id}/comments/${commentId}/replies`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: currentUsername, text: textVal })
          });

          if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Failed to submit reply.');
          }

          const newReply = await res.json();

          // Append reply locally
          const comment = setup.comments.find(c => c.id === commentId);
          if (comment) {
            if (!comment.replies) comment.replies = [];
            comment.replies.push(newReply);
          }

          commentsList.innerHTML = renderCommentsList(setup.comments, setup.username);
          commentsCount.textContent = getTotalCommentsCount(setup);

          showToast('Reply posted!');
        } catch (err) {
          console.error(err);
          showToast(err.message || 'Failed to submit reply.', 'error');
        } finally {
          submitBtn.disabled = false;
          submitBtn.textContent = originalText;
        }
      }

      // 2. Submit Inline Edit Form (Comment/Reply)
      if (form.classList.contains('inline-edit-form')) {
        const type = form.dataset.type;
        const commentId = form.dataset.commentId;
        const textarea = form.querySelector('.inline-edit-textarea');
        const textVal = textarea.value.trim();
        if (!textVal) return;

        const submitBtn = form.querySelector('.btn-save-edit');
        const originalText = submitBtn.textContent;

        try {
          submitBtn.disabled = true;
          submitBtn.textContent = '...';

          const endpoint = type === 'comment'
            ? `/api/setups/${setup.id}/comments/${commentId}/edit`
            : `/api/setups/${setup.id}/comments/${commentId}/replies/${form.dataset.replyId}/edit`;

          const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: currentUsername, text: textVal })
          });

          if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Failed to edit comment.');
          }

          const updatedCommentObj = await res.json();

          // Update local memory
          const comment = setup.comments.find(c => c.id === commentId);
          if (type === 'comment') {
            if (comment) comment.text = updatedCommentObj.text;
          } else {
            const reply = comment ? comment.replies.find(r => r.id === form.dataset.replyId) : null;
            if (reply) reply.text = updatedCommentObj.text;
          }

          commentsList.innerHTML = renderCommentsList(setup.comments, setup.username);
          showToast('Comment updated!');
        } catch (err) {
          console.error(err);
          showToast(err.message || 'Failed to edit comment.', 'error');
        } finally {
          submitBtn.disabled = false;
          submitBtn.textContent = originalText;
        }
      }
    });
  }

  // Delete Comment Confirmation Modal Helper
  function openDeleteCommentConfirmModal(setupId, commentId, replyId) {
    const isReply = replyId !== null;
    const title = isReply ? "Delete Reply" : "Delete Comment";
    const html = `
      <div style="margin-bottom: 20px;">
        <p style="color: var(--text-main); font-size: 14.5px; margin-bottom: 12px; line-height: 1.6;">
          Are you sure you want to permanently delete this ${isReply ? 'reply' : 'comment'}?
        </p>
        <p style="color: #f87171; font-size: 12px; font-weight: 500; display:flex; align-items:center; gap:6px;">
          <i class="fa-solid fa-triangle-exclamation"></i> This action cannot be undone.
        </p>
      </div>
      <div style="display: flex; gap: 12px;">
        <button class="secondary-btn" id="btn-cancel-comment-delete" style="flex:1;">Cancel</button>
        <button class="primary-btn" id="btn-confirm-comment-delete" style="flex:1; background: linear-gradient(135deg, #ef4444, #b91c1c); box-shadow: 0 4px 15px rgba(239, 68, 68, 0.3);">Delete</button>
      </div>
    `;
    openModal(title, html);

    document.getElementById('btn-cancel-comment-delete').addEventListener('click', closeModal);
    document.getElementById('btn-confirm-comment-delete').addEventListener('click', async () => {
      const confirmBtn = document.getElementById('btn-confirm-comment-delete');
      const originalText = confirmBtn.textContent;
      const currentUsername = getOrGenerateUsername();

      try {
        confirmBtn.disabled = true;
        confirmBtn.innerHTML = '<div class="loading-spinner" style="width:12px;height:12px;border-width:2px;display:inline-block;vertical-align:middle;"></div>';

        const endpoint = isReply
          ? `/api/setups/${setupId}/comments/${commentId}/replies/${replyId}/delete`
          : `/api/setups/${setupId}/comments/${commentId}/delete`;

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: currentUsername })
        });

        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.error || 'Delete failed.');
        }

        // Update local memory
        const setupsRes = await fetch(`/api/setups/${setupId}`);
        if (setupsRes.ok) {
          const updatedSetup = await setupsRes.json();
          // Find the active setup in list or update details
          const commentsList = document.getElementById('comments-list');
          const commentsCount = document.getElementById('comments-count');
          
          // Re-render detail page comments list
          if (commentsList && commentsCount) {
            commentsList.innerHTML = renderCommentsList(updatedSetup.comments, updatedSetup.username);
            commentsCount.textContent = getTotalCommentsCount(updatedSetup);
          }
        }

        showToast(isReply ? 'Reply deleted.' : 'Comment deleted.');
        closeModal();
      } catch (err) {
        console.error(err);
        showToast(err.message || 'Deletion failed.', 'error');
        confirmBtn.disabled = false;
        confirmBtn.textContent = originalText;
      }
    });
  }

  // ==============================================
  // USER PROFILES & FOLLOW SYSTEM LOGIC
  // ==============================================
  function getBio(username) {
    const key = username.toLowerCase();
    // Check if bio exists in profile (including empty string — user intentionally cleared it)
    if (state.profiles[key] && state.profiles[key].bio !== undefined && state.profiles[key].bio !== null) {
      return state.profiles[key].bio;
    }
    // Generate a deterministic bio for other users
    const bios = [
      'Battlestation builder and tech enthusiast. Obsessed with clean cable management. 🛠️',
      'Minimalist desk designer. Coding by day, gaming by night. ☕💤',
      'RGB lover. My keyboard has more lights than a Christmas tree. ⌨️🌈',
      'Mechanical keyboard collector. Linear switch advocate. ⌨️💜',
      'Ergonomics nerd. Standing desk and split keyboard devotee. 🚶‍♂️💻',
      'Dorm room setups on a budget. Student developer. 🎓💡'
    ];
    const idx = Math.abs(username.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) % bios.length;
    return bios[idx];
  }

  function getSocials(username) {
    const key = username.toLowerCase();
    if (state.profiles[key]) {
      return {
        twitter: state.profiles[key].twitter || '',
        instagram: state.profiles[key].instagram || '',
        github: state.profiles[key].github || ''
      };
    }
    // Generate deterministic social handles for mock users
    const norm = username.toLowerCase().replace(/[^a-z0-9]/g, '');
    return {
      twitter: `${norm}_tweets`,
      instagram: `${norm}_desks`,
      github: norm
    };
  }

  function getFollowing() {
    return JSON.parse(localStorage.getItem('deskflex_following') || '[]');
  }

  function isFollowing(username) {
    return getFollowing().includes(username.trim().toLowerCase());
  }

  function toggleFollow(username) {
    let following = getFollowing();
    const norm = username.trim().toLowerCase();
    const idx = following.indexOf(norm);
    if (idx !== -1) {
      following.splice(idx, 1);
      localStorage.setItem('deskflex_following', JSON.stringify(following));
      return false; // Unfollowed
    } else {
      following.push(norm);
      localStorage.setItem('deskflex_following', JSON.stringify(following));
      return true; // Followed
    }
  }

  function getFollowerCount(username) {
    // Return follower count based on mock data. For the logged‑in user we treat the number of accounts they follow as their follower count (since real data isn’t persisted).
    const myName = getOrGenerateUsername();
    const isOwn = username.toLowerCase() === myName.toLowerCase();
    if (isOwn) {
      return getFollowing().length;
    }
    // No real follower data for other users – return 0 to avoid showing bot counts.
    return 0;
  }

  // Edit Modal Overlay handlers
  const editModal = document.getElementById('edit-modal');
  const modalTitle = document.getElementById('modal-title');
  const modalBodyContent = document.getElementById('modal-body-content');
  const btnCloseModal = document.getElementById('btn-close-modal');

  function openModal(title, contentHTML) {
    modalTitle.textContent = title;
    modalBodyContent.innerHTML = contentHTML;
    editModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden'; // Lock body scrolling
  }

  function closeModal() {
    editModal.classList.add('hidden');
    modalBodyContent.innerHTML = '';
    document.body.style.overflow = ''; // Unlock scrolling
  }

  if (btnCloseModal) {
    btnCloseModal.addEventListener('click', closeModal);
  }
  if (editModal) {
    editModal.addEventListener('click', (e) => {
      if (e.target === editModal) closeModal();
    });
  }

  // Instagram-style circular profile avatar magnification overlay
  function openMagnifiedAvatar(username, avatarUrl) {
    if (document.getElementById('avatar-magnify-overlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'avatar-magnify-overlay';
    overlay.className = 'avatar-magnify-overlay';

    const initials = username.slice(0, 2).toUpperCase();
    const innerHTML = avatarUrl
      ? `<img src="${avatarUrl}" alt="${escapeHTML(username)}">`
      : `<span class="avatar-magnify-initials">${escapeHTML(initials)}</span>`;

    overlay.innerHTML = `
      <div class="avatar-magnify-container">
        <div class="avatar-magnify-circle">
          ${innerHTML}
        </div>
        <div class="avatar-magnify-username">@${escapeHTML(username)}</div>
      </div>
    `;

    document.body.appendChild(overlay);

    // Trigger transition
    setTimeout(() => {
      overlay.classList.add('show');
    }, 20);

    // Save existing overflow and lock scrolling
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Close function
    const closeOverlay = () => {
      overlay.classList.remove('show');
      document.body.style.overflow = originalOverflow;
      
      // Remove element after transition
      overlay.addEventListener('transitionend', function handler(e) {
        if (e.propertyName === 'opacity') {
          overlay.removeEventListener('transitionend', handler);
          overlay.remove();
        }
      });
      
      // Cleanup Escape key event listener
      document.removeEventListener('keydown', handleEsc);
    };

    // Close when clicking anywhere on the overlay
    overlay.addEventListener('click', closeOverlay);

    // Dismiss with Escape key
    function handleEsc(e) {
      if (e.key === 'Escape') {
        closeOverlay();
      }
    }
    document.addEventListener('keydown', handleEsc);
  }

  // Follower List Modals (Instagram-style lists of who follows or is followed)
  function openFollowsModal(type, username) {
    const myName = getOrGenerateUsername();
    const isOwn = username.toLowerCase() === myName.toLowerCase();
    
    let userListHTML = '';
    
    if (type === 'following') {
      const followingList = isOwn ? getFollowing() : [username + '_friend', 'NordicDesign', 'NeonLegend'].map(u => u.toLowerCase());
      if (followingList.length === 0) {
        userListHTML = `<div class="no-users-modal">Not following any users yet.</div>`;
      } else {
        userListHTML = followingList.map(user => {
          const initials = user.slice(0, 2).toUpperCase();
          const userProfile = state.profiles[user.toLowerCase()];
          const avatarHTML = (userProfile && userProfile.avatar_url)
            ? `<img src="${userProfile.avatar_url}" style="width:100%;height:100%;object-fit:cover;">`
            : initials;
          return `
            <div class="follows-user-row">
              <div class="follows-user-avatar" data-username="${user}" style="overflow: hidden;">${avatarHTML}</div>
              <div class="follows-user-info">
                <span class="follows-user-name" data-username="${user}">${escapeHTML(user)}</span>
              </div>
              <button class="secondary-btn modal-user-view-btn" data-username="${user}">View Profile</button>
            </div>
          `;
        }).join('');
      }
    } else {
      // Followers list
      // Followers list – there is no persisted follower data, so show an empty list.
      const followerList = [];
      userListHTML = `<div class="no-users-modal">No followers to display.</div>`;
    }

    const title = type === 'following' ? `Following` : `Followers`;
    const html = `
      <div class="follows-modal-list">
        ${userListHTML}
      </div>
    `;
    openModal(title, html);

    // Bind navigation events programmatically to avoid global scoping ReferenceErrors for closeModal
    modalBodyContent.querySelectorAll('.follows-user-avatar, .follows-user-name, .modal-user-view-btn').forEach(el => {
      el.addEventListener('click', (e) => {
        const targetUser = e.currentTarget.dataset.username;
        closeModal();
        window.location.hash = `#/profile/${encodeURIComponent(targetUser)}`;
      });
    });
  }

  // Likers List Modal (Instagram-style lists of who liked a setup post)
  async function openLikesModal(setupId) {
    try {
      // Show loading spinner inside the modal card first
      openModal('Likes', `
        <div class="loading-spinner-container">
          <div class="loading-spinner"></div>
          <p>Loading likes...</p>
        </div>
      `);

      // Fetch profiles to get avatars, and the setup details to get liked_by array
      await fetchProfiles();
      const myName = getOrGenerateUsername();
      const res = await fetch(`/api/setups/${setupId}?username=${encodeURIComponent(myName)}&t=${Date.now()}`);
      if (!res.ok) {
        throw new Error('Failed to load setup details.');
      }
      const setup = await res.json();
      const likedBy = setup.liked_by || [];

      if (likedBy.length === 0) {
        modalBodyContent.innerHTML = `<div class="no-users-modal">No likes on this setup yet.</div>`;
        return;
      }

      const userListHTML = likedBy.map(user => {
        const initials = user.slice(0, 2).toUpperCase();
        const userProfile = state.profiles[user.toLowerCase()];
        const avatarHTML = (userProfile && userProfile.avatar_url)
          ? `<img src="${userProfile.avatar_url}" style="width:100%;height:100%;object-fit:cover;">`
          : initials;
        return `
          <div class="follows-user-row">
            <div class="follows-user-avatar" data-username="${user}" style="overflow: hidden;">${avatarHTML}</div>
            <div class="follows-user-info">
              <span class="follows-user-name" data-username="${user}">${escapeHTML(user)}</span>
            </div>
            <button class="secondary-btn modal-user-view-btn" data-username="${user}">View Profile</button>
          </div>
        `;
      }).join('');

      modalBodyContent.innerHTML = `
        <div class="follows-modal-list">
          ${userListHTML}
        </div>
      `;

      // Bind navigation events programmatically
      modalBodyContent.querySelectorAll('.follows-user-avatar, .follows-user-name, .modal-user-view-btn').forEach(el => {
        el.addEventListener('click', (e) => {
          const targetUser = e.currentTarget.dataset.username;
          closeModal();
          window.location.hash = `#/profile/${encodeURIComponent(targetUser)}`;
        });
      });

    } catch (err) {
      console.error(err);
      modalBodyContent.innerHTML = `<div class="no-users-modal" style="color:#ef4444">Error loading likes.</div>`;
      showToast('Could not load likes list.', 'error');
    }
  }

  // Profile page loader
  async function loadProfile(username) {
    const container = document.getElementById('profile-container');
    container.innerHTML = `
      <div class="loading-spinner-container">
        <div class="loading-spinner"></div>
        <p>Loading profile...</p>
      </div>
    `;

    try {
      await fetchProfiles();
      const myName = getOrGenerateUsername();
      const response = await fetch(`/api/setups?username=${encodeURIComponent(myName)}&t=${Date.now()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch workspaces.');
      }
      const setups = await response.json();
      
      // Filter setups uploaded by this user
      const userSetups = setups.filter(s => s.username.toLowerCase() === username.toLowerCase());
      
      // Filter liked setups (where the current user has voted)
      // Since votes are tracked in LocalStorage for this browser, we only fetch setups matching voted IDs
      const isOwnProfile = username.toLowerCase() === myName.toLowerCase();
      let likedSetups = [];
      if (isOwnProfile) {
        const likedIds = getLikedSetups();
        likedSetups = setups.filter(s => likedIds.includes(s.id));
      }

      // Calculate total likes received
      const totalLikes = userSetups.reduce((sum, s) => sum + s.likes, 0);

      renderProfile(username, userSetups, likedSetups, totalLikes);
    } catch (err) {
      console.error(err);
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon" style="color:#ef4444"><i class="fa-solid fa-user-slash"></i></div>
          <h3>Profile Error</h3>
          <p>Failed to load profile details for ${escapeHTML(username)}.</p>
          <a href="#/" class="secondary-btn"><i class="fa-solid fa-arrow-left"></i> Back to Feed</a>
        </div>
      `;
      showToast('Could not load profile.', 'error');
    }
  }

  function renderProfile(username, userSetups, likedSetups, totalLikes) {
    const container = document.getElementById('profile-container');
    const myUsername = getOrGenerateUsername();
    const isOwnProfile = username.toLowerCase() === myUsername.toLowerCase();
    
    // Stats calculations
    const followingCount = isOwnProfile ? getFollowing().length : (username.length * 4) % 9 + 4;
    const followerCount = getFollowerCount(username);
    const followingActive = isFollowing(username);
    const userBio = getBio(username);
    const socials = getSocials(username);

    // Initial letters for avatar
    const initials = username.slice(0, 2).toUpperCase();
    const userProfile = state.profiles[username.toLowerCase()];
    const avatarUrl = userProfile ? userProfile.avatar_url : "";
    const avatarHTML = avatarUrl 
      ? `<img src="${avatarUrl}" alt="${username}" style="width: 100%; height: 100%; object-fit: cover;">` 
      : initials;

    // Instagram/Facebook Layout structure
    container.innerHTML = `
      <!-- Social Media Header Card -->
      <div class="profile-header-card">
        <div class="profile-main-layout">
          <!-- Avatar -->
          <div class="profile-avatar-large" style="overflow: hidden;">${avatarHTML}</div>
          
          <!-- Details -->
          <div class="profile-text-details">
            <div class="profile-username-row">
              <h2 class="profile-username-title">${escapeHTML(username)}</h2>
              ${isOwnProfile ? '<span class="self-badge">You</span>' : ''}
              
              <div class="profile-header-actions-inline">
                ${isOwnProfile ? `
                  <button class="secondary-btn edit-profile-btn-sm" id="btn-edit-profile" title="Edit Profile Details">
                    <i class="fa-solid fa-gear"></i> <span>Edit Profile</span>
                  </button>
                ` : `
                  <button class="follow-btn profile-action-btn ${followingActive ? 'following' : 'primary-btn'}" id="btn-follow-profile">
                    ${followingActive ? '<i class="fa-solid fa-circle-check"></i> <span>Following</span>' : '<i class="fa-solid fa-plus"></i> <span>Follow</span>'}
                  </button>
                `}
              </div>
            </div>

            <!-- Social Count Indicators (Clickable Followers/Following) -->
            <div class="profile-stats-row">
              <div class="profile-stat-box">
                <span class="stat-num">${userSetups.length}</span>
                <span class="stat-label">posts</span>
              </div>
              <div class="profile-stat-box clickable-stat" id="stat-followers">
                <span class="stat-num" id="profile-follower-count">${followerCount}</span>
                <span class="stat-label">followers</span>
              </div>
              <div class="profile-stat-box clickable-stat" id="stat-following">
                <span class="stat-num">${followingCount}</span>
                <span class="stat-label">following</span>
              </div>
              <div class="profile-stat-box">
                <span class="stat-num">${totalLikes}</span>
                <span class="stat-label">likes received</span>
              </div>
            </div>

            <!-- User Bio Text (Instagram style) -->
            <div class="profile-bio-container">
              <span class="profile-display-name">${escapeHTML(username)}</span>
              <p class="profile-bio-text">${escapeHTML(userBio)}</p>
            </div>

            <!-- Social Media Handles Link Icons -->
            <div class="profile-social-handles-row">
              ${socials.twitter ? `
                <a href="https://twitter.com/${socials.twitter}" target="_blank" class="social-link-icon" title="Twitter Profile">
                  <i class="fa-brands fa-twitter"></i> @${escapeHTML(socials.twitter)}
                </a>
              ` : ''}
              ${socials.instagram ? `
                <a href="https://instagram.com/${socials.instagram}" target="_blank" class="social-link-icon" title="Instagram Profile">
                  <i class="fa-brands fa-instagram"></i> @${escapeHTML(socials.instagram)}
                </a>
              ` : ''}
              ${socials.github ? `
                <a href="https://github.com/${socials.github}" target="_blank" class="social-link-icon" title="GitHub Profile">
                  <i class="fa-brands fa-github"></i> @${escapeHTML(socials.github)}
                </a>
              ` : ''}
            </div>

          </div>
        </div>
      </div>

      <!-- Instagram Style Grid / Liked Tabs Navigation -->
      <div class="profile-tabs-nav">
        <button class="profile-tab-btn active" id="tab-workspaces-btn">
          <i class="fa-solid fa-border-all"></i> POSTS
        </button>
        ${isOwnProfile ? `
          <button class="profile-tab-btn" id="tab-liked-btn">
            <i class="fa-regular fa-heart"></i> LIKED POSTS
          </button>
        ` : ''}
      </div>

      <!-- Tab Content Area -->
      <div class="profile-tab-content">
        <!-- Tab 1: Workspaces Grid -->
        <div class="tab-pane active" id="tab-workspaces">
          ${userSetups.length === 0 ? `
            <div class="empty-state" style="padding: 60px 0;">
              <div class="empty-state-icon"><i class="fa-regular fa-image"></i></div>
              <h3>No Shared Posts Yet</h3>
              <p>${isOwnProfile ? 'Let the world see your creative creations!' : 'This user has not shared any creations yet.'}</p>
              ${isOwnProfile ? '<a href="#/upload" class="primary-btn" style="margin-top:16px;"><i class="fa-solid fa-cloud-arrow-up"></i> Upload Post</a>' : ''}
            </div>
          ` : `
            <div class="instagram-grid">
              ${userSetups.map(setup => {
                const commentCount = getTotalCommentsCount(setup);
                return `
                  <div class="insta-grid-item" onclick="window.location.hash = '#/setup/${setup.id}'">
                    <img src="${setup.image_url}" alt="${setup.title}" class="insta-grid-img" loading="lazy">
                    
                    <!-- Hover overlay showing counts (Instagram style) -->
                    <div class="insta-hover-overlay">
                      <div class="overlay-stat"><i class="fa-solid fa-heart"></i> ${setup.likes}</div>
                      <div class="overlay-stat"><i class="fa-solid fa-comment"></i> ${commentCount}</div>
                    </div>
                    
                    ${setup.private ? `
                      <div class="grid-private-indicator" style="position: absolute; top: 12px; left: 12px; background: rgba(7, 8, 10, 0.7); backdrop-filter: blur(4px); width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 1px solid var(--border-color); color: var(--accent-pink); font-size: 12px; z-index: 2;" title="Private Setup"><i class="fa-solid fa-lock"></i></div>
                    ` : ''}

                    ${isOwnProfile ? `
                      <!-- Post manager buttons floating on grids -->
                      <div class="grid-item-editor-controls" onclick="event.stopPropagation();">
                        <button class="grid-ctrl-btn edit-btn" data-id="${setup.id}" title="Edit Post"><i class="fa-solid fa-pen"></i></button>
                        <button class="grid-ctrl-btn delete-btn" data-id="${setup.id}" title="Delete Post"><i class="fa-solid fa-trash"></i></button>
                      </div>
                    ` : ''}
                  </div>
                `;
              }).join('')}
            </div>
          `}
        </div>

        <!-- Tab 2: Liked Setups Grid -->
        ${isOwnProfile ? `
          <div class="tab-pane hidden" id="tab-liked">
            ${likedSetups.length === 0 ? `
              <div class="empty-state" style="padding: 60px 0;">
                <div class="empty-state-icon" style="color:var(--accent-pink);"><i class="fa-regular fa-heart"></i></div>
                <h3>No Liked Posts</h3>
                <p>Creations you like will appear here.</p>
                <a href="#/" class="secondary-btn" style="margin-top:16px;"><i class="fa-solid fa-compass"></i> Discover Creations</a>
              </div>
            ` : `
              <div class="instagram-grid">
                ${likedSetups.map(setup => {
                  const commentCount = getTotalCommentsCount(setup);
                  return `
                    <div class="insta-grid-item" onclick="window.location.hash = '#/setup/${setup.id}'">
                      <img src="${setup.image_url}" alt="${setup.title}" class="insta-grid-img" loading="lazy">
                      <div class="insta-hover-overlay">
                        <div class="overlay-stat"><i class="fa-solid fa-heart"></i> ${setup.likes}</div>
                        <div class="overlay-stat"><i class="fa-solid fa-comment"></i> ${commentCount}</div>
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
            `}
          </div>
        ` : ''}
      </div>
    `;

    // Hook up Follow Action button and Avatar Zoom
    if (!isOwnProfile) {
      const followBtn = document.getElementById('btn-follow-profile');
      const followerCountEl = document.getElementById('profile-follower-count');
      
      followBtn.addEventListener('click', () => {
        const followed = toggleFollow(username);
        followerCountEl.textContent = getFollowerCount(username);
        
        if (followed) {
          followBtn.className = 'follow-btn profile-action-btn following';
          followBtn.innerHTML = '<i class="fa-solid fa-circle-check"></i> <span>Following</span>';
          showToast(`Now following ${username}!`);
        } else {
          followBtn.className = 'follow-btn profile-action-btn primary-btn';
          followBtn.innerHTML = '<i class="fa-solid fa-plus"></i> <span>Follow</span>';
          showToast(`Unfollowed ${username}.`);
        }
      });
    } else {
      // Hook up Edit Profile Name / Bio button
      document.getElementById('btn-edit-profile').addEventListener('click', () => {
        openEditProfileModal(username, userBio, socials);
      });

      // Hook up Grid Edit Setup buttons
      container.querySelectorAll('.insta-grid-item .edit-btn').forEach(btn => {
        const setupId = btn.dataset.id;
        const setup = userSetups.find(s => s.id === setupId);
        btn.addEventListener('click', () => {
          openEditSetupModal(setup);
        });
      });

      // Hook up Grid Delete Setup buttons
      container.querySelectorAll('.insta-grid-item .delete-btn').forEach(btn => {
        const setupId = btn.dataset.id;
        const setup = userSetups.find(s => s.id === setupId);
        btn.addEventListener('click', () => {
          openDeleteSetupModal(setup);
        });
      });
    }

    // Click event for profile avatar magnification (applicable to both own and other profiles)
    const profileAvatarEl = container.querySelector('.profile-avatar-large');
    if (profileAvatarEl) {
      profileAvatarEl.classList.add('clickable-avatar-zoom');
      profileAvatarEl.addEventListener('click', () => {
        openMagnifiedAvatar(username, avatarUrl);
      });
    }

    // Hook up Clicking stats for lists modals
    document.getElementById('stat-followers').addEventListener('click', () => {
      openFollowsModal('followers', username);
    });
    document.getElementById('stat-following').addEventListener('click', () => {
      openFollowsModal('following', username);
    });

    // Hook up Instagram Tabs togglers
    if (isOwnProfile) {
      const tabWorkspacesBtn = document.getElementById('tab-workspaces-btn');
      const tabLikedBtn = document.getElementById('tab-liked-btn');
      const paneWorkspaces = document.getElementById('tab-workspaces');
      const paneLiked = document.getElementById('tab-liked');

      tabWorkspacesBtn.addEventListener('click', () => {
        tabWorkspacesBtn.classList.add('active');
        tabLikedBtn.classList.remove('active');
        paneWorkspaces.classList.remove('hidden');
        paneWorkspaces.classList.add('active');
        paneLiked.classList.add('hidden');
        paneLiked.classList.remove('active');
      });

      tabLikedBtn.addEventListener('click', () => {
        tabLikedBtn.classList.add('active');
        tabWorkspacesBtn.classList.remove('active');
        paneLiked.classList.remove('hidden');
        paneLiked.classList.add('active');
        paneWorkspaces.classList.add('hidden');
        paneWorkspaces.classList.remove('active');
      });
    }
  }

  // --- Modal Forms Layouts & Event Wiring ---
  function openEditProfileModal(currentName, currentBio, currentSocials) {
    const key = currentName.toLowerCase();
    const userProfile = state.profiles[key];
    const avatarUrl = userProfile ? userProfile.avatar_url : "";
    const initials = currentName.slice(0, 2).toUpperCase();

    const html = `
      <form id="modal-edit-profile-form" novalidate>
        <!-- Profile Picture Section -->
        <div class="form-group profile-avatar-edit-group" style="margin-bottom: 24px;">
          <label class="form-label">Profile Picture</label>
          <div class="avatar-edit-row" style="display: flex; align-items: center; gap: 20px; margin-bottom: 16px;">
            <div class="profile-avatar-large" id="modal-avatar-preview" style="width: 80px; height: 80px; border-radius: 50%; overflow: hidden; background: linear-gradient(135deg, var(--accent-purple), var(--accent-blue)); color:#fff; font-size: 28px; font-weight:800; display:flex; align-items:center; justify-content:center;">
              ${avatarUrl ? `<img src="${avatarUrl}" style="width:100%;height:100%;object-fit:cover;">` : initials}
            </div>
            <div class="avatar-edit-actions" style="display: flex; flex-direction: column; gap: 8px;">
              <label for="upload-avatar-input" class="secondary-btn upload-avatar-btn" style="padding: 8px 14px; font-size: 12px; border-radius: var(--radius-md); cursor: pointer; display: inline-flex; align-items: center; gap: 6px; margin:0;">
                <i class="fa-solid fa-camera"></i> Change Photo
              </label>
              <input type="file" id="upload-avatar-input" accept="image/jpeg, image/png, image/webp" style="display: none;">
              <button type="button" class="secondary-btn remove-avatar-btn" id="btn-remove-avatar" style="border-color: rgba(239, 68, 68, 0.3); color: #f87171; padding: 8px 14px; font-size: 12px; border-radius: var(--radius-md); display: ${avatarUrl ? 'inline-flex' : 'none'}; align-items: center; gap: 6px; background: none; cursor: pointer; height: 32px;"><i class="fa-solid fa-trash"></i> Remove</button>
            </div>
          </div>
          
          <!-- Cropper Container (hidden initially) -->
          <div id="cropper-container" class="cropper-container hidden" style="background: var(--bg-tertiary); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 16px; margin-top: 16px;">
            <div class="cropper-canvas-wrapper" style="display: flex; justify-content: center; margin-bottom: 12px; position:relative;">
              <canvas id="cropper-canvas" width="280" height="280" style="background:#000; border-radius:var(--radius-sm); cursor:move; max-width:100%;"></canvas>
            </div>
            <div class="cropper-controls" style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px; justify-content: center; width: 100%;">
              <span class="cropper-icon" style="color:var(--text-muted); font-size:12px;"><i class="fa-solid fa-magnifying-glass-minus"></i></span>
              <input type="range" id="cropper-zoom" min="1" max="4" step="0.05" class="cropper-slider" style="flex:1; max-width:200px; accent-color:var(--accent-purple); height:6px; border-radius:3px; outline:none; background:rgba(255,255,255,0.1);">
              <span class="cropper-icon" style="color:var(--text-muted); font-size:12px;"><i class="fa-solid fa-magnifying-glass-plus"></i></span>
            </div>
            <div class="cropper-buttons" style="display: flex; gap: 10px; justify-content: flex-end;">
              <button type="button" class="secondary-btn btn-cancel-crop" id="btn-cancel-crop" style="padding: 6px 12px; font-size:12px;">Cancel</button>
              <button type="button" class="primary-btn btn-apply-crop" id="btn-apply-crop" style="padding: 6px 12px; font-size:12px;">Apply crop</button>
            </div>
          </div>
        </div>

        <div class="form-group">
          <label for="edit-profile-username" class="form-label">Profile Username <span class="required">*</span></label>
          <input type="text" id="edit-profile-username" class="form-control" value="${escapeHTML(currentName)}" maxlength="30" required>
          <div class="validation-error" id="modal-profile-error" style="min-height:0;margin-top:2px;"></div>
        </div>
        
        <div class="form-group">
          <label for="edit-profile-bio" class="form-label">Profile Bio / Tagline</label>
          <textarea id="edit-profile-bio" class="form-control textarea" maxlength="150" style="min-height:75px;" placeholder="Tell us about yourself...">${escapeHTML(currentBio)}</textarea>
        </div>

        <div class="form-group">
          <label class="form-label">Social Media Links</label>
          <div class="input-icon-wrapper" style="margin-bottom:8px;">
            <span class="input-icon"><i class="fa-brands fa-twitter"></i></span>
            <input type="text" id="edit-profile-twitter" class="form-control pad-left" placeholder="Twitter username" value="${escapeHTML(currentSocials.twitter || '')}" maxlength="30">
          </div>
          <div class="input-icon-wrapper" style="margin-bottom:8px;">
            <span class="input-icon"><i class="fa-brands fa-instagram"></i></span>
            <input type="text" id="edit-profile-instagram" class="form-control pad-left" placeholder="Instagram username" value="${escapeHTML(currentSocials.instagram || '')}" maxlength="30">
          </div>
          <div class="input-icon-wrapper">
            <span class="input-icon"><i class="fa-brands fa-github"></i></span>
            <input type="text" id="edit-profile-github" class="form-control pad-left" placeholder="GitHub username" value="${escapeHTML(currentSocials.github || '')}" maxlength="30">
          </div>
        </div>

        <button type="submit" class="primary-btn submit-btn" id="btn-save-profile-modal" style="margin-top: 15px;">
          <i class="fa-solid fa-circle-check"></i> Save Changes
        </button>
      </form>
    `;
    openModal('Edit Profile', html);

    // Make sure we clear any previously cropped avatar blob
    state.croppedAvatarBlob = null;
    let avatarRemoved = false;

    // Attach picture change/crop events:
    const fileInput = document.getElementById('upload-avatar-input');
    const cropperContainer = document.getElementById('cropper-container');
    const btnSaveModal = document.getElementById('btn-save-profile-modal');
    const avatarPreview = document.getElementById('modal-avatar-preview');
    const btnRemoveAvatar = document.getElementById('btn-remove-avatar');

    if (btnRemoveAvatar) {
      btnRemoveAvatar.addEventListener('click', () => {
        avatarPreview.innerHTML = initials;
        avatarRemoved = true;
        state.croppedAvatarBlob = null;
        btnRemoveAvatar.style.display = 'none';
        showToast('Photo queued for removal.');
      });
    }

    fileInput.addEventListener('change', (e) => {
      if (e.target.files.length === 0) return;
      const file = e.target.files[0];
      
      // Limit to 5MB and check type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        showToast('Only JPG, PNG or WEBP images are supported.', 'error');
        fileInput.value = '';
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        showToast('Profile image is too large. Max is 5 MB.', 'error');
        fileInput.value = '';
        return;
      }

      // Read file and start cropper
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          cropperContainer.classList.remove('hidden');
          btnSaveModal.disabled = true; // Disable saving while cropping
          initCropper(img);
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    });

    function initCropper(img) {
      let canvas = document.getElementById('cropper-canvas');
      let ctx = canvas.getContext('2d');
      // Existing cropper logic unchanged
const zoomSlider = document.getElementById('cropper-zoom');
      const btnCancelCrop = document.getElementById('btn-cancel-crop');
      const btnApplyCrop = document.getElementById('btn-apply-crop');

      const cropSize = 200;
      const minZoom = Math.max(cropSize / img.width, cropSize / img.height);
      let zoom = minZoom * 1.2;
      
      zoomSlider.min = minZoom;
      zoomSlider.max = minZoom * 4;
      zoomSlider.value = zoom;
      zoomSlider.step = (minZoom * 3) / 100;
      
      let imgX = canvas.width / 2;
      let imgY = canvas.height / 2;
      let isDragging = false;
      let startX, startY;
      
      function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        const w = img.width * zoom;
        const h = img.height * zoom;
        const dx = imgX - w / 2;
        const dy = imgY - h / 2;
        
        ctx.save();
        ctx.drawImage(img, dx, dy, w, h);
        ctx.restore();
        
        ctx.save();
        ctx.fillStyle = 'rgba(7, 8, 10, 0.75)';
        ctx.beginPath();
        ctx.rect(0, 0, canvas.width, canvas.height);
        ctx.arc(canvas.width / 2, canvas.height / 2, cropSize / 2, 0, Math.PI * 2, true);
        ctx.fill();
        
        ctx.beginPath();
        ctx.arc(canvas.width / 2, canvas.height / 2, cropSize / 2, 0, Math.PI * 2);
        ctx.strokeStyle = 'var(--accent-purple)';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.font = '11px var(--font-sans)';
        ctx.textAlign = 'center';
        ctx.fillText('Drag to position • Scroll/Slide to zoom', canvas.width / 2, 265);
      }
      
      function getMousePos(e) {
        const rect = canvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        return {
          x: clientX - rect.left,
          y: clientY - rect.top
        };
      }
      
      function startDrag(e) {
        isDragging = true;
        const pos = getMousePos(e);
        startX = pos.x - imgX;
        startY = pos.y - imgY;
        if (e.cancelable) e.preventDefault();
      }
      
      function drag(e) {
        if (!isDragging) return;
        const pos = getMousePos(e);
        
        let targetX = pos.x - startX;
        let targetY = pos.y - startY;
        
        const w = img.width * zoom;
        const h = img.height * zoom;
        const limitX = cropSize / 2;
        const limitY = cropSize / 2;
        
        if (targetX - w / 2 > canvas.width / 2 - limitX) targetX = canvas.width / 2 - limitX + w / 2;
        if (targetX + w / 2 < canvas.width / 2 + limitX) targetX = canvas.width / 2 + limitX - w / 2;
        if (targetY - h / 2 > canvas.height / 2 - limitY) targetY = canvas.height / 2 - limitY + h / 2;
        if (targetY + h / 2 < canvas.height / 2 + limitY) targetY = canvas.height / 2 + limitY - h / 2;
        
        imgX = targetX;
        imgY = targetY;
        draw();
      }
      
      function stopDrag() {
        isDragging = false;
      }
      
      // Clean up previous event listeners by cloning canvas
      const newCanvas = canvas.cloneNode(true);
      canvas.parentNode.replaceChild(newCanvas, canvas);
      
      canvas = newCanvas;
      ctx = canvas.getContext('2d');
      
      canvas.addEventListener('mousedown', startDrag);
      canvas.addEventListener('mousemove', drag);
      window.addEventListener('mouseup', stopDrag);
      
      canvas.addEventListener('touchstart', startDrag, { passive: false });
      canvas.addEventListener('touchmove', drag, { passive: false });
      window.addEventListener('touchend', stopDrag);
      
      zoomSlider.addEventListener('input', (e) => {
        zoom = parseFloat(e.target.value);
        const w = img.width * zoom;
        const h = img.height * zoom;
        const limitX = cropSize / 2;
        const limitY = cropSize / 2;
        
        if (imgX - w / 2 > canvas.width / 2 - limitX) imgX = canvas.width / 2 - limitX + w / 2;
        if (imgX + w / 2 < canvas.width / 2 + limitX) imgX = canvas.width / 2 + limitX - w / 2;
        if (imgY - h / 2 > canvas.height / 2 - limitY) imgY = canvas.height / 2 - limitY + h / 2;
        if (imgY + h / 2 < canvas.height / 2 + limitY) imgY = canvas.height / 2 + limitY - h / 2;
        
        draw();
      });
      
      canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        const factor = e.deltaY < 0 ? 1.05 : 0.95;
        const nextZoom = Math.max(parseFloat(zoomSlider.min), Math.min(parseFloat(zoomSlider.max), zoom * factor));
        zoomSlider.value = nextZoom;
        zoomSlider.dispatchEvent(new Event('input'));
      }, { passive: false });
      
      draw();

      // Apply crop
      btnApplyCrop.addEventListener('click', () => {
        const outputCanvas = document.createElement('canvas');
        outputCanvas.width = cropSize;
        outputCanvas.height = cropSize;
        const oCtx = outputCanvas.getContext('2d');
        
        const srcX = canvas.width / 2 - cropSize / 2;
        const srcY = canvas.height / 2 - cropSize / 2;
        
        const w = img.width * zoom;
        const h = img.height * zoom;
        const dx = imgX - w / 2;
        const dy = imgY - h / 2;
        
        const relativeX = (srcX - dx) / zoom;
        const relativeY = (srcY - dy) / zoom;
        const relativeW = cropSize / zoom;
        const relativeH = cropSize / zoom;
        
        oCtx.drawImage(img, relativeX, relativeY, relativeW, relativeH, 0, 0, cropSize, cropSize);
        
        outputCanvas.toBlob((blob) => {
          state.croppedAvatarBlob = blob;
          
          const blobUrl = URL.createObjectURL(blob);
          avatarPreview.innerHTML = `<img src="${blobUrl}" style="width:100%;height:100%;object-fit:cover;">`;
          avatarRemoved = false;
          
          if (btnRemoveAvatar) {
            btnRemoveAvatar.style.display = 'inline-flex';
          }
          
          cropperContainer.classList.add('hidden');
          btnSaveModal.disabled = false;
          showToast('Image cropped and applied.');
        }, 'image/jpeg', 0.9);
      });

      // Cancel crop
      btnCancelCrop.addEventListener('click', () => {
        cropperContainer.classList.add('hidden');
        btnSaveModal.disabled = false;
        fileInput.value = '';
      });
    }

    const form = document.getElementById('modal-edit-profile-form');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const newName = document.getElementById('edit-profile-username').value.trim();
      const newBio = document.getElementById('edit-profile-bio').value.trim();
      const newTwitter = document.getElementById('edit-profile-twitter').value.trim();
      const newInstagram = document.getElementById('edit-profile-instagram').value.trim();
      const newGithub = document.getElementById('edit-profile-github').value.trim();
      
      const errorEl = document.getElementById('modal-profile-error');
      
      if (!newName) {
        errorEl.textContent = 'Username cannot be blank.';
        return;
      }

      const saveBtn = document.getElementById('btn-save-profile-modal');
      const originalHTML = saveBtn.innerHTML;

      try {
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<div class="loading-spinner" style="width:12px;height:12px;border-width:2px;display:inline-block;vertical-align:middle;margin-right:6px;"></div> Saving...';

        let activeUsername = currentName;

        // 1. If username changed, hit backend update cascade
        if (newName.toLowerCase() !== currentName.toLowerCase()) {
          const response = await fetch('/api/profile/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ oldUsername: currentName, newUsername: newName })
          });

          if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || 'Failed to update username.');
          }
          
          localStorage.setItem('deskflex_username', newName);
          activeUsername = newName;
        }

        // 2. Save bio & socials on the server
        const profileRes = await fetch(`/api/profile/${encodeURIComponent(activeUsername)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bio: newBio,
            twitter: newTwitter,
            instagram: newInstagram,
            github: newGithub
          })
        });

        if (!profileRes.ok) {
          throw new Error('Failed to save profile text details.');
        }

        // 3. Remove avatar if requested
        if (avatarRemoved && !state.croppedAvatarBlob) {
          await fetch(`/api/profile/${encodeURIComponent(activeUsername)}/avatar/remove`, {
            method: 'POST'
          });
        }

        // 4. Upload cropped avatar blob if set
        if (state.croppedAvatarBlob) {
          const formData = new FormData();
          formData.append('avatar', state.croppedAvatarBlob, 'avatar.jpg');
          
          const avatarRes = await fetch(`/api/profile/${encodeURIComponent(activeUsername)}/avatar`, {
            method: 'POST',
            body: formData
          });

          if (!avatarRes.ok) {
            throw new Error('Profile text updated, but avatar upload failed.');
          }
          state.croppedAvatarBlob = null;
        }
        
        // Refresh profiles map and update navbar
        await fetchProfiles();
        updateNavbar(activeUsername);
        
        showToast('Profile updated!');
        closeModal();
        
        // Refresh page (route to username hash or load profile directly if already there)
        const targetHash = `#/profile/${encodeURIComponent(activeUsername)}`;
        if (window.location.hash === targetHash) {
          loadProfile(activeUsername);
        } else {
          window.location.hash = targetHash;
        }
      } catch (err) {
        console.error(err);
        errorEl.textContent = err.message || 'Error updating profile.';
        showToast('Update failed.', 'error');
      } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = originalHTML;
      }
    });
  }

  function openEditSetupModal(setup) {
    const html = `
      <form id="modal-edit-setup-form" novalidate>
        <div class="form-group">
          <label for="edit-setup-title" class="form-label">Post Title <span class="required">*</span></label>
          <input type="text" id="edit-setup-title" class="form-control" value="${escapeHTML(setup.title)}" maxlength="50" required>
        </div>
        <div class="form-group">
          <label for="edit-setup-category" class="form-label">Category <span class="required">*</span></label>
          <select id="edit-setup-category" class="form-control" required>
            <option value="Gaming" ${setup.category === 'Gaming' ? 'selected' : ''}>Gaming</option>
            <option value="Minimal" ${setup.category === 'Minimal' ? 'selected' : ''}>Minimal</option>
            <option value="Productivity" ${setup.category === 'Productivity' ? 'selected' : ''}>Productivity</option>
            <option value="Budget" ${setup.category === 'Budget' ? 'selected' : ''}>Budget</option>
            <option value="Luxury" ${setup.category === 'Luxury' ? 'selected' : ''}>Luxury</option>
            <option value="Student" ${setup.category === 'Student' ? 'selected' : ''}>Student</option>
            <option value="Coding" ${setup.category === 'Coding' ? 'selected' : ''}>Coding</option>
            <option value="Other" ${setup.category === 'Other' ? 'selected' : ''}>Other</option>
          </select>
        </div>
        <div class="form-group">
          <label for="edit-setup-visibility" class="form-label">Visibility</label>
          <select id="edit-setup-visibility" class="form-control">
            <option value="public" ${!setup.private ? 'selected' : ''}>Public (Visible to everyone)</option>
            <option value="private" ${setup.private ? 'selected' : ''}>Private (Only visible on your profile)</option>
          </select>
        </div>
        <div class="form-group">
          <label for="edit-setup-desc" class="form-label">Description</label>
          <textarea id="edit-setup-desc" class="form-control textarea" maxlength="300" style="min-height:90px;">${escapeHTML(setup.description || '')}</textarea>
        </div>
        <div class="validation-error" id="modal-setup-error"></div>
        <button type="submit" class="primary-btn submit-btn" id="btn-save-setup-modal" style="margin-top: 15px;">
          <i class="fa-solid fa-circle-check"></i> Save Changes
        </button>
      </form>
    `;
    openModal('Edit Post Details', html);

    const form = document.getElementById('modal-edit-setup-form');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const titleVal = document.getElementById('edit-setup-title').value.trim();
      const categoryVal = document.getElementById('edit-setup-category').value;
      const descVal = document.getElementById('edit-setup-desc').value.trim();
      const visibilityVal = document.getElementById('edit-setup-visibility').value;
      const errorEl = document.getElementById('modal-setup-error');

      if (!titleVal) {
        errorEl.textContent = 'Title is required.';
        return;
      }

      const saveBtn = document.getElementById('btn-save-setup-modal');
      const originalHTML = saveBtn.innerHTML;

      try {
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<div class="loading-spinner" style="width:12px;height:12px;border-width:2px;display:inline-block;vertical-align:middle;margin-right:6px;"></div> Saving...';

        const response = await fetch(`/api/setups/${setup.id}/edit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            title: titleVal, 
            category: categoryVal, 
            description: descVal,
            private: visibilityVal === 'private'
          })
        });

        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.error || 'Failed to edit post.');
        }

        showToast('Changes saved successfully!');
        closeModal();
        
        // Refresh page / view depending on route
        if (state.currentRoute.startsWith('#/setup/')) {
          loadDetail(setup.id);
        } else if (state.currentRoute.startsWith('#/profile/')) {
          loadProfile(setup.username);
        } else {
          loadFeed();
        }
      } catch (err) {
        console.error(err);
        errorEl.textContent = err.message || 'Error saving post details.';
      } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = originalHTML;
      }
    });
  }

  function openDeleteSetupModal(setup) {
    const html = `
      <div style="margin-bottom: 20px;">
        <p style="color: var(--text-main); font-size: 14.5px; margin-bottom: 12px; line-height: 1.6;">Are you sure you want to permanently delete <strong>"${escapeHTML(setup.title)}"</strong>?</p>
        <p style="color: #f87171; font-size: 12px; font-weight: 500; display:flex; align-items:center; gap:6px;"><i class="fa-solid fa-triangle-exclamation"></i> Warning: This action cannot be undone and will delete the post and all comments.</p>
      </div>
      <div style="display: flex; gap: 12px;">
        <button class="secondary-btn" id="btn-cancel-delete" style="flex:1;">Cancel</button>
        <button class="primary-btn" id="btn-confirm-delete" style="flex:1; background: linear-gradient(135deg, #ef4444, #b91c1c); box-shadow: 0 4px 15px rgba(239, 68, 68, 0.3);">Delete Post</button>
      </div>
    `;
    openModal('Delete Post', html);

    document.getElementById('btn-cancel-delete').addEventListener('click', closeModal);
    document.getElementById('btn-confirm-delete').addEventListener('click', async () => {
      const confirmBtn = document.getElementById('btn-confirm-delete');
      const originalHTML = confirmBtn.innerHTML;

      try {
        confirmBtn.disabled = true;
        confirmBtn.innerHTML = '<div class="loading-spinner" style="width:12px;height:12px;border-width:2px;display:inline-block;vertical-align:middle;"></div>';

        const response = await fetch(`/api/setups/${setup.id}/delete`, {
          method: 'POST'
        });

        if (!response.ok) {
          throw new Error('Delete post failed.');
        }

        showToast('Post deleted successfully.');
        closeModal();
        
        if (state.currentRoute.startsWith('#/setup/')) {
          window.location.hash = '#/';
        } else if (state.currentRoute.startsWith('#/profile/')) {
          loadProfile(setup.username);
        } else {
          loadFeed();
        }
      } catch (err) {
        console.error(err);
        showToast('Deletion failed.', 'error');
        confirmBtn.disabled = false;
        confirmBtn.innerHTML = originalHTML;
      }
    });
  }

  function openPostOptionsModal(setup) {
    const currentUsername = getOrGenerateUsername();
    const isOwnPost = setup.username.toLowerCase() === currentUsername.toLowerCase();
    const followingActive = isFollowing(setup.username);

    let optionsHTML = `
      <div class="instagram-options-list" style="display:flex; flex-direction:column; width:100%;">
    `;

    if (isOwnPost) {
      optionsHTML += `
        <button class="options-modal-btn danger" id="opt-delete"><i class="fa-solid fa-trash"></i> Delete Post</button>
        <button class="options-modal-btn" id="opt-edit"><i class="fa-solid fa-pen"></i> Edit Caption & Details</button>
        <button class="options-modal-btn" id="opt-toggle-privacy">
          ${setup.private ? '<i class="fa-solid fa-unlock"></i> Make Public' : '<i class="fa-solid fa-lock"></i> Make Private'}
        </button>
      `;
    } else {
      optionsHTML += `
        <button class="options-modal-btn" id="opt-follow" style="color: ${followingActive ? '#f87171' : 'var(--accent-purple)'}; font-weight:600;">
          ${followingActive ? '<i class="fa-solid fa-user-minus"></i> Unfollow Creator' : '<i class="fa-solid fa-user-plus"></i> Follow Creator'}
        </button>
        <button class="options-modal-btn" id="opt-view-profile"><i class="fa-solid fa-user"></i> View Profile</button>
      `;
    }

    optionsHTML += `
        <button class="options-modal-btn" id="opt-copy-link"><i class="fa-solid fa-link"></i> Copy Link</button>
        <button class="options-modal-btn secondary" id="opt-cancel" style="border-bottom:none;"><i class="fa-solid fa-xmark"></i> Cancel</button>
      </div>
    `;

    openModal('Post Options', optionsHTML);

    const btnCancel = document.getElementById('opt-cancel');
    if (btnCancel) btnCancel.addEventListener('click', closeModal);

    const btnCopy = document.getElementById('opt-copy-link');
    if (btnCopy) {
      btnCopy.addEventListener('click', () => {
        const shareUrl = `${window.location.origin}${window.location.pathname}#/setup/${setup.id}`;
        navigator.clipboard.writeText(shareUrl)
          .then(() => {
            closeModal();
            showToast('Share link copied to clipboard!');
          })
          .catch(() => {
            closeModal();
            showToast('Failed to copy link.', 'error');
          });
      });
    }

    if (isOwnPost) {
      document.getElementById('opt-edit').addEventListener('click', () => {
        closeModal();
        openEditSetupModal(setup);
      });

      document.getElementById('opt-delete').addEventListener('click', () => {
        closeModal();
        openDeleteSetupModal(setup);
      });

      document.getElementById('opt-toggle-privacy').addEventListener('click', async () => {
        const newPrivateState = !setup.private;
        const btnToggle = document.getElementById('opt-toggle-privacy');
        btnToggle.disabled = true;
        btnToggle.textContent = 'Updating...';

        try {
          const response = await fetch(`/api/setups/${setup.id}/edit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: setup.title,
              category: setup.category,
              description: setup.description,
              private: newPrivateState
            })
          });

          if (!response.ok) throw new Error('Failed to update privacy.');
          
          showToast(`Post is now ${newPrivateState ? 'private' : 'public'}!`);
          closeModal();
          
          if (state.currentRoute.startsWith('#/setup/')) {
            loadDetail(setup.id);
          } else if (state.currentRoute.startsWith('#/profile/')) {
            loadProfile(setup.username);
          } else {
            loadFeed();
          }
        } catch (err) {
          console.error(err);
          showToast('Failed to update post privacy.', 'error');
          btnToggle.disabled = false;
        }
      });
    } else {
      document.getElementById('opt-follow').addEventListener('click', () => {
        const followed = toggleFollow(setup.username);
        showToast(followed ? `Now following ${setup.username}!` : `Unfollowed ${setup.username}.`);
        closeModal();
        
        if (state.currentRoute.startsWith('#/setup/')) {
          loadDetail(setup.id);
        } else if (state.currentRoute.startsWith('#/profile/')) {
          loadProfile(setup.username);
        } else {
          loadFeed();
        }
      });

      document.getElementById('opt-view-profile').addEventListener('click', () => {
        closeModal();
        window.location.hash = `#/profile/${encodeURIComponent(setup.username)}`;
      });
    }
  }

  // Load profiles cache from server
  async function fetchProfiles() {
    try {
      const res = await fetch(`/api/profiles?t=${Date.now()}`);
      if (res.ok) {
        state.profiles = await res.json();
      }
    } catch (err) {
      console.error('Error loading profiles:', err);
    }
  }

  // Update navbar elements with name and profile picture
  function updateNavbar(name) {
    const nameEl = document.getElementById('nav-profile-name');
    if (nameEl) {
      nameEl.textContent = name;
    }
    
    const navProfileBtn = document.getElementById('btn-nav-profile');
    if (navProfileBtn) {
      const userProfile = state.profiles[name.toLowerCase()];
      const existingImg = navProfileBtn.querySelector('.nav-avatar-img');
      const existingIcon = navProfileBtn.querySelector('i');
      
      if (userProfile && userProfile.avatar_url) {
        if (existingIcon) existingIcon.remove();
        if (existingImg) {
          existingImg.src = userProfile.avatar_url;
        } else {
          const img = document.createElement('img');
          img.className = 'nav-avatar-img';
          img.src = userProfile.avatar_url;
          img.alt = name;
          navProfileBtn.insertBefore(img, nameEl);
        }
      } else {
        if (existingImg) existingImg.remove();
        if (!existingIcon) {
          const icon = document.createElement('i');
          icon.className = 'fa-solid fa-user-astronaut';
          navProfileBtn.insertBefore(icon, nameEl);
        }
      }
    }
  }

  // ==============================================
  // USERNAME SEARCH LOGIC
  // ==============================================
  const searchInput = document.getElementById('nav-search-input');
  const searchDropdown = document.getElementById('search-results-dropdown');
  const clearSearchBtn = document.getElementById('btn-clear-search');

  if (searchInput && searchDropdown && clearSearchBtn) {
    let lastQuery = '';

    const performSearch = async (query) => {
      if (!query) {
        searchDropdown.innerHTML = '';
        searchDropdown.classList.add('hidden');
        clearSearchBtn.classList.add('hidden');
        return;
      }
      clearSearchBtn.classList.remove('hidden');

      try {
        const res = await fetch(`/api/search/users?q=${encodeURIComponent(query)}`);
        if (!res.ok) throw new Error('Search request failed');
        const results = await res.json();

        // Check if query is still matching current input
        if (searchInput.value.trim() !== query) return;

        if (results.length === 0) {
          searchDropdown.innerHTML = `<div class="search-no-results">No users found</div>`;
        } else {
          searchDropdown.innerHTML = results.map(user => {
            const initials = user.username.slice(0, 2).toUpperCase();
            const avatarUrl = user.avatar_url;
            const avatarHTML = avatarUrl
              ? `<img src="${avatarUrl}" class="search-avatar-img" style="width: 100%; height: 100%; object-fit: cover;">`
              : `<div class="search-avatar-initials" style="font-size: 11px; font-weight: 700; color: var(--text-muted);">${initials}</div>`;

            return `
              <div class="search-result-item" data-username="${user.username}" style="display: flex; align-items: center; gap: 10px; padding: 10px 14px; border-bottom: 1px solid var(--border-color); cursor: pointer; transition: var(--transition-fast);">
                <div class="search-avatar-wrapper" style="width: 28px; height: 28px; border-radius: 50%; overflow: hidden; background: var(--bg-tertiary); display: flex; align-items: center; justify-content: center; border: 1px solid var(--border-color); flex-shrink: 0;">${avatarHTML}</div>
                <span class="search-username-text" style="font-weight: 600; color: #fff; font-size: 13px;">${escapeHTML(user.username)}</span>
              </div>
            `;
          }).join('');
        }
        searchDropdown.classList.remove('hidden');
      } catch (err) {
        console.error('Search error:', err);
      }
    };

    // Listen to input changes
    searchInput.addEventListener('input', (e) => {
      const q = e.target.value.trim();
      if (q !== lastQuery) {
        lastQuery = q;
        performSearch(q);
      }
    });

    // Clear search button
    clearSearchBtn.addEventListener('click', () => {
      searchInput.value = '';
      lastQuery = '';
      performSearch('');
      searchInput.focus();
    });

    // Handle focus
    searchInput.addEventListener('focus', () => {
      const q = searchInput.value.trim();
      if (q) {
        searchDropdown.classList.remove('hidden');
      }
    });

    // Handle click on search item (using event delegation)
    searchDropdown.addEventListener('click', (e) => {
      const item = e.target.closest('.search-result-item');
      if (item) {
        const username = item.dataset.username;
        searchInput.value = '';
        lastQuery = '';
        performSearch('');
        window.location.hash = `#/profile/${encodeURIComponent(username)}`;
      }
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.nav-search-wrapper')) {
        searchDropdown.classList.add('hidden');
      }
    });
  }

  // ==============================================
  // HELPER FUNCTIONS
  // ==============================================
  function escapeHTML(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
});

