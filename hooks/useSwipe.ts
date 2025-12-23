import { TouchEvent, useState, useEffect } from 'react';

interface SwipeInput {
    onSwipedLeft?: () => void;
    onSwipedRight?: () => void;
    onSwipedUp?: () => void;
    onSwipedDown?: () => void;
}

interface SwipeState {
    touchStart: number | null;
    touchEnd: number | null;
    verticalStart: number | null;
    verticalEnd: number | null;
}

export const useSwipe = ({ onSwipedLeft, onSwipedRight, onSwipedUp, onSwipedDown }: SwipeInput) => {
    const [touchStart, setTouchStart] = useState<number | null>(null);
    const [touchEnd, setTouchEnd] = useState<number | null>(null);
    const [verticalStart, setVerticalStart] = useState<number | null>(null);
    const [verticalEnd, setVerticalEnd] = useState<number | null>(null);

    // Minimum distance required for a swipe
    const minSwipeDistance = 50;

    const onTouchStart = (e: TouchEvent) => {
        setTouchEnd(null);
        setVerticalEnd(null);
        setTouchStart(e.targetTouches[0].clientX);
        setVerticalStart(e.targetTouches[0].clientY);
    };

    const onTouchMove = (e: TouchEvent) => {
        setTouchEnd(e.targetTouches[0].clientX);
        setVerticalEnd(e.targetTouches[0].clientY);
    };

    const onTouchEnd = () => {
        if (!touchStart || !touchEnd) return;

        const distanceX = touchStart - touchEnd;
        const isLeftSwipe = distanceX > minSwipeDistance;
        const isRightSwipe = distanceX < -minSwipeDistance;

        // Check if vertical movement is significant (scrolling)
        // If vertical distance is greater than horizontal, it's likely a scroll
        const distanceY = (verticalStart || 0) - (verticalEnd || 0);
        if (Math.abs(distanceY) > Math.abs(distanceX)) {
            // It's a scroll, not a horizontal swipe
            return;
        }

        if (isLeftSwipe && onSwipedLeft) {
            onSwipedLeft();
        }
        if (isRightSwipe && onSwipedRight) {
            onSwipedRight();
        }
    };

    return {
        onTouchStart,
        onTouchMove,
        onTouchEnd
    };
};
