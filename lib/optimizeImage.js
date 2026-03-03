export const getOptimizedUrl = (url, width = 1080) => {
    if (!url || !url.includes("cloudinary.com")) return url;
    
    // This tells Cloudinary to automatically format (WebP), compress quality, and resize
    // BEFORE it even reaches the user's phone.
    return url.replace("/upload/", `/upload/f_auto,q_auto,w_${width}/`);
};