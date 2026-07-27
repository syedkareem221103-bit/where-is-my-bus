import { z } from 'zod';

export const registerSchema = z.object({
  body: z.object({
    orgName: z.string({
      required_error: 'Organization name is required',
    }).min(2, 'Organization name must be at least 2 characters'),
    
    subdomain: z.string({
      required_error: 'Subdomain is required',
    })
    .min(2, 'Subdomain must be at least 2 characters')
    .regex(/^[a-z0-9-]+$/, 'Subdomain can only contain lowercase alphanumeric characters and hyphens'),
    
    contactEmail: z.string({
      required_error: 'Contact email is required',
    }).email('Invalid contact email address'),
    
    adminEmail: z.string({
      required_error: 'Admin email is required',
    }).email('Invalid administrator email address'),
    
    password: z.string({
      required_error: 'Password is required',
    }).min(6, 'Password must be at least 6 characters'),
    
    firstName: z.string({
      required_error: 'First name is required',
    }).min(1, 'First name is required'),
    
    lastName: z.string({
      required_error: 'Last name is required',
    }).min(1, 'Last name is required'),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string({
      required_error: 'Email is required',
    }).email('Invalid email address'),
    
    password: z.string({
      required_error: 'Password is required',
    }).min(6, 'Password must be at least 6 characters'),

    deviceType: z.string({
      required_error: 'Device type is required',
    }).min(1, 'Device type is required'),
  }),
});

export const refreshSchema = z.object({
  body: z.object({
    refreshToken: z.string({
      required_error: 'Refresh token is required',
    }),
  }),
});
