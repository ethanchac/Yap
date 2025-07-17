import { useState } from 'react';
import { X, ImageIcon } from 'lucide-react';

function CreatePost() {
    // Post state
    const [content, setContent] = useState('');
    const [isSubmittingPost, setIsSubmittingPost] = useState(false);
    const [postMessage, setPostMessage] = useState('');
    const [postError, setPostError] = useState('');
    
    // Image upload state
    const [selectedImages, setSelectedImages] = useState([]);
    const [imagePreviewUrls, setImagePreviewUrls] = useState([]);
    const [uploadingImages, setUploadingImages] = useState(false);

    // Image handling functions
    const handleImageSelect = (e) => {
        const files = Array.from(e.target.files);
        const maxImages = 4; // Limit to 4 images per post
        const maxSize = 5 * 1024 * 1024; // 5MB per image
        
        if (selectedImages.length + files.length > maxImages) {
            setPostError(`You can only upload up to ${maxImages} images per post`);
            return;
        }

        const validFiles = [];
        const newPreviewUrls = [];

        files.forEach(file => {
            // Check file size
            if (file.size > maxSize) {
                setPostError(`Image "${file.name}" is too large. Maximum size is 5MB.`);
                return;
            }

            // Check file type
            if (!file.type.startsWith('image/')) {
                setPostError(`"${file.name}" is not a valid image file.`);
                return;
            }

            validFiles.push(file);
            newPreviewUrls.push(URL.createObjectURL(file));
        });

        setSelectedImages(prev => [...prev, ...validFiles]);
        setImagePreviewUrls(prev => [...prev, ...newPreviewUrls]);
        setPostError(''); // Clear any previous errors
    };

    const removeImage = (index) => {
        // Revoke the object URL to free memory
        URL.revokeObjectURL(imagePreviewUrls[index]);
        
        setSelectedImages(prev => prev.filter((_, i) => i !== index));
        setImagePreviewUrls(prev => prev.filter((_, i) => i !== index));
    };

    const uploadImages = async () => {
        if (selectedImages.length === 0) return [];

        setUploadingImages(true);
        const uploadedImageUrls = [];

        try {
            const token = localStorage.getItem('token');
            
            for (const image of selectedImages) {
                const formData = new FormData();
                formData.append('image', image);

                const response = await fetch('http://localhost:5000/posts/upload-image', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    },
                    body: formData
                });

                const data = await response.json();
                
                if (response.ok) {
                    uploadedImageUrls.push(data.imageUrl);
                } else {
                    throw new Error(data.error || 'Failed to upload image');
                }
            }

            return uploadedImageUrls;
        } finally {
            setUploadingImages(false);
        }
    };

    const handlePostSubmit = async (e) => {
        e.preventDefault();
        
        if (!content.trim() && selectedImages.length === 0) {
            setPostError('Content or images are required');
            return;
        }

        setIsSubmittingPost(true);
        setPostError('');
        setPostMessage('');

        try {
            const token = localStorage.getItem('token');
            
            if (!token) {
                setPostError('You must be logged in to create a post');
                setIsSubmittingPost(false);
                return;
            }

            // Upload images first if any are selected
            let imageUrls = [];
            if (selectedImages.length > 0) {
                imageUrls = await uploadImages();
            }

            const response = await fetch('http://localhost:5000/posts/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    content: content.trim(),
                    images: imageUrls // Send the uploaded image URLs
                })
            });

            const data = await response.json();

            if (response.ok) {
                setPostMessage('Post created successfully!');
                setContent(''); // clear the form
                
                // Clear images
                imagePreviewUrls.forEach(url => URL.revokeObjectURL(url));
                setSelectedImages([]);
                setImagePreviewUrls([]);
            } else {
                setPostError(data.error || 'Failed to create post');
            }
        } catch (err) {
            setPostError('Network error. Please try again.');
        } finally {
            setIsSubmittingPost(false);
        }
    };

    return (
        <div className="space-y-4">
            {/* Post Creation Form with Image Upload */}
            <form onSubmit={handlePostSubmit} className="space-y-4">
                <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="What's on your mind?"
                    maxLength={280}
                    disabled={isSubmittingPost}
                    className="w-full p-4 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-gray-400 resize-none h-32"
                />
                
                {/* Image Upload Section */}
                <div className="space-y-3">
                    {/* Image Upload Button */}
                    <div className="flex items-center space-x-3">
                        <label 
                            htmlFor="image-upload"
                            className="flex items-center space-x-2 px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg cursor-pointer transition-colors"
                        >
                            <ImageIcon className="w-5 h-5" />
                            <span>Add Photos</span>
                        </label>
                        <input
                            id="image-upload"
                            type="file"
                            multiple
                            accept="image/*"
                            onChange={handleImageSelect}
                            className="hidden"
                            disabled={isSubmittingPost || uploadingImages}
                        />
                        <span className="text-gray-400 text-sm">
                            {selectedImages.length}/4 images
                        </span>
                    </div>

                    {/* Image Previews */}
                    {imagePreviewUrls.length > 0 && (
                        <div className="grid grid-cols-2 gap-3">
                            {imagePreviewUrls.map((url, index) => (
                                <div key={index} className="relative group">
                                    <img 
                                        src={url} 
                                        alt={`Preview ${index + 1}`}
                                        className="w-full h-32 object-cover rounded-lg border border-gray-600"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => removeImage(index)}
                                        className="absolute top-2 right-2 bg-red-600 hover:bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                
                <div className="flex items-center justify-between">
                    <span className={`text-sm ${content.length > 260 ? 'text-red-400' : 'text-gray-400'}`}>
                        {content.length}/280
                    </span>
                    
                    <button 
                        type="submit" 
                        disabled={
                            isSubmittingPost || 
                            uploadingImages || 
                            (!content.trim() && selectedImages.length === 0)
                        }
                        className="px-6 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 disabled:opacity-50 text-white rounded-lg font-bold transition-colors"
                    >
                        {isSubmittingPost ? 'Posting...' : 
                         uploadingImages ? 'Uploading...' : 'Create Post'}
                    </button>
                </div>
            </form>

            {/* Success/Error Messages */}
            {postMessage && (
                <div className="mt-4 p-3 bg-green-900 border border-green-700 text-green-300 rounded-lg">
                    {postMessage}
                </div>
            )}

            {postError && (
                <div className="mt-4 p-3 bg-red-900 border border-red-700 text-red-300 rounded-lg">
                    {postError}
                </div>
            )}
        </div>
    );
}

export default CreatePost;