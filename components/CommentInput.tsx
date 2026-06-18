import React, { useState, memo } from 'react';
import { User } from '../types';
import { commentService, Comment } from '../services/commentService';

interface CommentInputProps {
    projectId: string;
    currentUser: User | null;
    onCommentAdded: (comment: Comment) => void;
    onNavigateLogin: () => void;
}

// Memoized component to prevent re-renders from parent
export const CommentInput: React.FC<CommentInputProps> = memo(({
    projectId,
    currentUser,
    onCommentAdded,
    onNavigateLogin
}) => {
    const [newComment, setNewComment] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!projectId || !currentUser || !newComment.trim()) return;

        const added = await commentService.addComment(projectId, newComment, currentUser);
        if (added) {
            onCommentAdded(added);
            setNewComment('');
        }
    };

    if (!currentUser) {
        return (
            <div className="bg-[#ffffff] border border-[#e5e5e5] p-10 rounded-[30px] text-center mb-16">
                <h4 className="text-lg font-bold text-[#111111] mb-2">Join the conversation</h4>
                <p className="text-[#666666] font-medium mb-6">Sign in to share your thoughts.</p>
                <button onClick={onNavigateLogin} className="px-8 py-3 bg-[#4169E1] text-white rounded-full font-bold hover:bg-[#3458c7] transition-all">
                    Sign In
                </button>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="mb-16">
            <div className="flex gap-4">
                <img src={currentUser.avatarUrl || 'https://ui-avatars.com/api/?name=' + currentUser.name} className="w-10 h-10 rounded-full bg-[#ffffff] object-cover" alt="" />
                <div className="flex-1 space-y-4">
                    <div className="relative">
                        <textarea
                            value={newComment}
                            onChange={e => setNewComment(e.target.value)}
                            placeholder="Add to the discussion..."
                            className="w-full p-4 bg-[#ffffff] border border-[#e5e5e5] rounded-3xl resize-none outline-none focus:border-[#4169E1] focus:ring-1 focus:ring-[#4169E1] transition-all font-medium text-[15px] text-[#111111] min-h-[120px] placeholder-[#666666]"
                        />
                        <div className="absolute bottom-4 right-4">
                            <button
                                type="submit"
                                disabled={!newComment.trim()}
                                className="px-6 py-2 bg-[#4169E1] text-white rounded-full text-sm font-bold hover:bg-[#3458c7] transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100 disabled:hover:bg-[#4169E1]"
                            >
                                Post
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </form>
    );
});

CommentInput.displayName = 'CommentInput';
