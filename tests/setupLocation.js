// jsdom 14+ defines window.location as non-configurable, so tests that call
// Object.defineProperty(window, 'location', ...) throw TypeError.
// Patch Object.defineProperty to silently succeed for that specific case.
const origDefineProperty = Object.defineProperty.bind(Object);
origDefineProperty(Object, 'defineProperty', {
  configurable: true,
  writable: true,
  value: function patchedDefineProperty(obj, prop, descriptor) {
    if (prop === 'location' && (obj === window || obj === globalThis)) {
      return obj;
    }
    return origDefineProperty(obj, prop, descriptor);
  },
});
