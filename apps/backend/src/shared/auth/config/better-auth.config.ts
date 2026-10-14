import {
  bioSchema,
  defaultMoodSchema,
} from '@/shared/auth/config/profile-fields';
import { APIError } from 'better-auth/api';
import { openAPI, username } from 'better-auth/plugins';
import { BetterAuthOptions } from 'better-auth/types';

export const betterAuthCoreConfig: BetterAuthOptions = {
  emailAndPassword: {
    enabled: true,
  },
  user: {
    additionalFields: {
      role: {
        type: 'string',
        required: true,
        defaultValue: 'user',
        input: false,
      },
      bio: {
        type: 'string',
        required: false,
        input: true,
        validator: { input: bioSchema },
      },
      defaultMood: {
        type: 'string',
        required: false,
        input: true,
        validator: { input: defaultMoodSchema },
      },
    },
  },
  databaseHooks: {
    user: {
      update: {
        before: async (user) => {
          // The display name is required; BetterAuth itself accepts "".
          if (typeof user.name === 'string' && user.name.trim() === '') {
            throw APIError.from('BAD_REQUEST', {
              code: 'NAME_REQUIRED',
              message: 'Display name is required',
            });
          }
          return { data: user };
        },
      },
    },
  },
  // 3–30 characters of letters, numbers, dots and underscores — the plugin's
  // defaults, spelled out because the Settings page promises exactly this.
  plugins: [
    openAPI(),
    username({
      minUsernameLength: 3,
      maxUsernameLength: 30,
      usernameValidator: (value) => /^[a-zA-Z0-9_.]+$/.test(value),
    }),
  ],
};
