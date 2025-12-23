import { TouchEvent, useRef } from 'react';

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
    const touchStart = useRef<number | null>(null);
    const touchEnd = useRef<number | null>(null);
    const verticalStart = useRef<number | null>(null);
    const verticalEnd = useRef<number | null>(null);

    // Minimum distance required for a swipe
    const minSwipeDistance = 75;

    const onTouchStart = (e: TouchEvent) => {
        const target = e.target as HTMLElement;
        // Ignorar si el toque se origina en un elemento interactivo o de formulario
        if (target.closest('button, input, textarea, select, .no-swipe')) {
            touchStart.current = null;
            return;
        }

        touchEnd.current = null;
        verticalEnd.current = null;
        touchStart.current = e.targetTouches[0].clientX;
        verticalStart.current = e.targetTouches[0].clientY;
    };

    const onTouchMove = (e: TouchEvent) => {
        touchEnd.current = e.targetTouches[0].clientX;
        verticalEnd.current = e.targetTouches[0].clientY;
    };

    const onTouchEnd = () => {
        if (!touchStart.current || !touchEnd.current) return;

        const distanceX = touchStart.current - touchEnd.current;
        const isLeftSwipe = distanceX > minSwipeDistance;
        const isRightSwipe = distanceX < -minSwipeDistance;

        // Check if vertical movement is significant (scrolling)
        const distanceY = (verticalStart.current || 0) - (verticalEnd.current || 0);
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
