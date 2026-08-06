// Shared chrome for action menus (FloatingActionMenu and the Sounds card dropdown).
// Kept in a plain module so ShareToChatButton can style its menu-mode button to
// match the ActionMenuItem rows it sits beside.
export const ACTION_MENU_ITEM_CLASS =
    "flex min-h-[48px] w-full touch-manipulation items-center gap-3 border-b " +
    "border-gray-200 px-5 py-4 text-left text-base text-gray-700 transition " +
    "hover:bg-gray-200 disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 " +
    "dark:hover:bg-gray-700";

export const ACTION_MENU_ITEM_ACTIVE_CLASS =
    "border-transparent bg-blue-600 text-white hover:bg-blue-700";

// The panel owns the "no divider under the final row" rule so no call site has to
// track which of its conditionally-rendered items ends up last. The second variant
// reaches the button ShareToChatButton nests inside its wrapper divs.
export const ACTION_MENU_PANEL_CLASSES = [
    "py-1",
    "bg-gray-100 dark:bg-gray-800",
    "rounded-xl",
    "overflow-hidden",
    "[&>*:last-child]:border-b-0",
    "[&>*:last-child_button]:border-b-0",
];
