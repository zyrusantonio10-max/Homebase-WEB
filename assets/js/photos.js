/*
  Homebase room photos (office side).
  Photos are shrunk in the browser, uploaded to the Supabase Storage bucket "room-photos",
  and only their public links are saved on the room (rooms.images).
  Needs: supabase.js (HB_DB) and the "room-photos" bucket with the office upload policies.
*/
(function () {
  'use strict';
  var BUCKET = 'room-photos', MAX_PHOTOS = 5, MAX_SIDE = 1200, MAX_FILE = 15 * 1024 * 1024;

  function uuid() {
    return (window.crypto && crypto.randomUUID) ? crypto.randomUUID()
      : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) { var r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3 | 8)).toString(16); });
  }
  // shrink to at most 1200 px on the long side, as a JPEG
  function shrink(file) {
    return new Promise(function (resolve, reject) {
      if (!file || file.type.indexOf('image/') !== 0) { reject(new Error('That file is not a picture.')); return; }
      if (file.size > MAX_FILE) { reject(new Error('That picture is too big. Choose one under 15 MB.')); return; }
      var url = URL.createObjectURL(file), img = new Image();
      img.onload = function () {
        var k = Math.min(1, MAX_SIDE / Math.max(img.width, img.height)), c = document.createElement('canvas');
        c.width = Math.max(1, Math.round(img.width * k)); c.height = Math.max(1, Math.round(img.height * k));
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        c.toBlob(function (b) { b ? resolve(b) : reject(new Error('That picture could not be read.')); }, 'image/jpeg', 0.82);
      };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('That picture could not be read. Try a JPG or PNG.')); };
      img.src = url;
    });
  }
  function pathOf(url) { var i = String(url || '').indexOf('/' + BUCKET + '/'); return i < 0 ? '' : decodeURIComponent(String(url).slice(i + BUCKET.length + 2).split('?')[0]); }

  window.HB_PHOTOS = {
    MAX: MAX_PHOTOS,
    // Resolves to the public link of the uploaded photo.
    upload: function (roomId, file) {
      if (!window.HB_DB) return Promise.reject(new Error('Cannot reach the database right now.'));
      return shrink(file).then(function (blob) {
        var path = 'rooms/' + String(roomId).replace(/[^A-Za-z0-9_-]/g, '_') + '/' + uuid() + '.jpg';
        return HB_DB.storage.from(BUCKET).upload(path, blob, { contentType: 'image/jpeg', cacheControl: '31536000' }).then(function (r) {
          if (r.error) throw new Error('The upload failed. Check that you are logged in as the office and try again.');
          return HB_DB.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
        });
      });
    },
    // Deletes the stored file behind a link (ignores links that are not ours).
    remove: function (url) {
      var p = pathOf(url);
      if (p && window.HB_DB) HB_DB.storage.from(BUCKET).remove([p]).then(function () {}, function () {});
    }
  };
})();
