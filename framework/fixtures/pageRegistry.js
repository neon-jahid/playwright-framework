/**
 * Lazily instantiates page objects so tests can write `pages.loginPage` without
 * importing (or constructing) anything. Instances are cached per test and get
 * the shared logger + config injected automatically.
 *
 * `pages.loginPage` resolves to the `LoginPage` export of src/pages/index.js.
 */
export function createPageRegistry(registry, page, deps = {}) {
  const cache = new Map();
  const available = Object.keys(registry);

  const resolve = (name) => {
    const exportName = name.charAt(0).toUpperCase() + name.slice(1);
    return registry[exportName] ?? registry[name];
  };

  return new Proxy(
    {},
    {
      get(_target, property) {
        // Guard against promise-unwrapping and symbol lookups on the proxy.
        if (typeof property !== 'string' || property === 'then') return undefined;

        if (!cache.has(property)) {
          const PageClass = resolve(property);
          if (typeof PageClass !== 'function') {
            throw new Error(
              `Unknown page object "${property}". Export it from src/pages/index.js. ` +
                `Available: ${available.join(', ') || 'none registered'}.`
            );
          }
          cache.set(property, new PageClass(page, deps));
        }
        return cache.get(property);
      },
      has: (_target, property) => Boolean(resolve(String(property))),
      ownKeys: () => available.map((key) => key.charAt(0).toLowerCase() + key.slice(1)),
      getOwnPropertyDescriptor: () => ({ enumerable: true, configurable: true }),
    }
  );
}
