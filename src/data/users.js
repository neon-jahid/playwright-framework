/**
 * Static test data. Real credentials never live here - they come from
 * config/environments/.env.<env> and are exposed as config.users.<role>.
 */
export const invalidUser = {
  username: 'not.a.user@example.com',
  password: 'WrongPassword123!',
};

export const roles = {
  standard: 'standard',
  admin: 'admin',
};

/** Local mobile numbers, e.g. 01712345678 - the format the sign-up form expects. */
export const localPhoneNumber = (data) =>
  `01${data.pick(['3', '5', '6', '7', '8', '9'])}${data.number(10000000, 99999999)}`;

/**
 * A registration payload in the shape this application asks for: the generic
 * factory output plus the app-specific phone format and an adult date of birth
 * (the site is age gated).
 *
 * @param {import('../../framework/utils/dataFactory.js').dataFactory} data
 */
export const registrationData = (data, overrides = {}) =>
  data.user({
    phone: localPhoneNumber(data),
    dateOfBirth: data.dateOfBirth({ minAge: 21, maxAge: 45 }),
    ...overrides,
  });
