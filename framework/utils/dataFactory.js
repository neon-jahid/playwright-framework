/**
 * Test data generation. Every generator returns a plain object so callers can
 * override any field: dataFactory.user({ email: 'fixed@test.com' }).
 */
import { faker } from '@faker-js/faker';

/** Unique-per-millisecond suffix - keeps re-runs from colliding on unique fields. */
const unique = () => `${Date.now()}${faker.string.numeric(3)}`;

export const dataFactory = {
  /** Deterministic runs: dataFactory.seed(123) before generating. */
  seed: (value) => faker.seed(value),

  uniqueId: () => unique(),

  email: (prefix = 'qa') => `${prefix}.${unique()}@example.com`,

  /** Meets the usual "upper + lower + digit + symbol" policy. */
  password: (length = 12) => `${faker.internet.password({ length: Math.max(length - 3, 6) })}Aa1!`,

  username: () =>
    `${faker.internet
      .username()
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')}${faker.string.numeric(3)}`,

  phone: () => faker.phone.number({ style: 'international' }),

  string: (length = 10) => faker.string.alpha({ length }),

  number: (min = 1, max = 100) => faker.number.int({ min, max }),

  pick: (items) => faker.helpers.arrayElement(items),

  text: (sentences = 2) => faker.lorem.sentences(sentences),

  /** `YYYY-MM-DD` for an adult - the format `input[type=date]` accepts. */
  dateOfBirth: ({ minAge = 18, maxAge = 65 } = {}) =>
    faker.date.birthdate({ mode: 'age', min: minAge, max: maxAge }).toISOString().slice(0, 10),

  pastDate: (days = 30) => faker.date.recent({ days }).toISOString(),

  futureDate: (days = 30) => faker.date.soon({ days }).toISOString(),

  /**
   * A complete registration payload. Derived fields (fullName, email,
   * confirmPassword) stay consistent with whatever the caller overrides.
   */
  user: (overrides = {}) => {
    const merged = {
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      username: dataFactory.username(),
      phone: dataFactory.phone(),
      dateOfBirth: dataFactory.dateOfBirth(),
      password: dataFactory.password(),
      ...overrides,
    };
    return {
      ...merged,
      fullName: overrides.fullName ?? `${merged.firstName} ${merged.lastName}`,
      email: overrides.email ?? dataFactory.email(merged.firstName.toLowerCase()),
      confirmPassword: overrides.confirmPassword ?? merged.password,
    };
  },

  address: (overrides = {}) => ({
    street: faker.location.streetAddress(),
    city: faker.location.city(),
    state: faker.location.state(),
    zipCode: faker.location.zipCode(),
    country: faker.location.country(),
    ...overrides,
  }),

  company: (overrides = {}) => ({
    name: `${faker.company.name()} ${faker.string.numeric(3)}`,
    industry: faker.commerce.department(),
    website: faker.internet.url(),
    ...overrides,
  }),

  creditCard: (overrides = {}) => ({
    number: faker.finance.creditCardNumber(),
    cvv: faker.finance.creditCardCVV(),
    expiry: '12/30',
    holder: faker.person.fullName(),
    ...overrides,
  }),
};

export default dataFactory;
