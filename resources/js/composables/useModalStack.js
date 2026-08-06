const stack = [];

function lockScroll() {
    document.body.style.overflow = "hidden";
}

function unlockScroll() {
    document.body.style.overflow = null;
}

export function useModalStack() {
    function register(id) {
        if (!stack.includes(id)) {
            stack.push(id);
        }
        lockScroll();
    }

    function unregister(id) {
        const index = stack.indexOf(id);
        if (index > -1) {
            stack.splice(index, 1);
        }
        if (stack.length === 0) {
            unlockScroll();
        }
    }

    function isTopmost(id) {
        return stack[stack.length - 1] === id;
    }

    return { register, unregister, isTopmost };
}
