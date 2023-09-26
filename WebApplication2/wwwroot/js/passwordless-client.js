﻿// Source: https://cdn.passwordless.dev/dist/1.1.0/umd/passwordless.umd.js
// This code is originally by Passwordless.dev/Bitwarden
// It's just modified to point to a different URL
(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
    typeof define === 'function' && define.amd ? define(['exports'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.Passwordless = {}));
}(this, (function (exports) { 'use strict';

    class Client {
        constructor(config) {
            this.config = {
                apiUrl: 'http://localhost:7001',
                apiKey: 'testapp2:public:3e9d33800e6d46beab5ce54c591fef1d',
                origin: window.location.origin,
                rpid: window.location.hostname,
            };
            this.abortController = new AbortController();
            Object.assign(this.config, config);
        }
        /**
         * Register a new credential to a user
         *
         * @param {string} token Token generated by your backend and the Passwordless API
         */
        async register(token, credentialNickname) {
            var _a;
            try {
                this.assertBrowserSupported();
                const registration = await this.registerBegin(token);
                if (registration.error) {
                    console.error(registration.error);
                    return { error: registration.error };
                }
                registration.data.challenge = base64UrlToArrayBuffer(registration.data.challenge);
                registration.data.user.id = base64UrlToArrayBuffer(registration.data.user.id);
                (_a = registration.data.excludeCredentials) === null || _a === void 0 ? void 0 : _a.forEach((cred) => {
                    cred.id = base64UrlToArrayBuffer(cred.id);
                });
                const credential = await navigator.credentials.create({
                    publicKey: registration.data,
                });
                if (!credential) {
                    const error = {
                        from: "client",
                        errorCode: "failed_create_credential",
                        title: "Failed to create credential (navigator.credentials.create returned null)",
                    };
                    console.error(error);
                    return { error };
                }
                return await this.registerComplete(credential, registration.session, credentialNickname);
                // next steps
                // return a token from the API
                // Add a type to the token (method/action)
            }
            catch (caughtError) {
                const errorMessage = getErrorMessage(caughtError);
                const error = {
                    from: "client",
                    errorCode: "unknown",
                    title: errorMessage,
                };
                console.error(caughtError);
                console.error(error);
                return { error };
            }
        }
        /**
         * Sign in a user using the userid
         * @param {string} userId
         * @returns
         */
        async signinWithId(userId) {
            return this.signin({ userId });
        }
        /**
         * Sign in a user using an alias
         * @param {string} alias
         * @returns a verify_token
         */
        async signinWithAlias(alias) {
            return this.signin({ alias });
        }
        /**
         * Sign in a user using autofill UI (a.k.a conditional) sign in
         * @returns a verify_token
         */
        async signinWithAutofill() {
            if (!await isAutofillSupported()) {
                throw new Error("Autofill authentication (conditional meditation) is not supported in this browser");
            }
            return this.signin({ autofill: true });
        }
        /**
         * Sign in a user using discoverable credentials
         * @returns a verify_token
         */
        async signinWithDiscoverable() {
            return this.signin({ discoverable: true });
        }
        abort() {
            if (this.abortController) {
                this.abortController.abort();
            }
        }
        isPlatformSupported() {
            return isPlatformSupported();
        }
        isBrowserSupported() {
            return isBrowserSupported();
        }
        isAutofillSupported() {
            return isAutofillSupported();
        }
        async registerBegin(token) {
            const response = await fetch(`${this.config.apiUrl}/register/begin`, {
                method: 'POST',
                headers: this.createHeaders(),
                body: JSON.stringify({
                    token,
                    RPID: this.config.rpid,
                    Origin: this.config.origin,
                }),
            });
            const res = await response.json();
            if (response.ok) {
                return res;
            }
            return { error: { ...res, from: "server" } };
        }
        async registerComplete(credential, session, credentialNickname) {
            const attestationResponse = credential.response;
            const response = await fetch(`${this.config.apiUrl}/register/complete`, {
                method: 'POST',
                headers: this.createHeaders(),
                body: JSON.stringify({
                    session: session,
                    response: {
                        id: credential.id,
                        rawId: arrayBufferToBase64Url(credential.rawId),
                        type: credential.type,
                        extensions: credential.getClientExtensionResults(),
                        response: {
                            AttestationObject: arrayBufferToBase64Url(attestationResponse.attestationObject),
                            clientDataJson: arrayBufferToBase64Url(attestationResponse.clientDataJSON),
                        },
                    },
                    nickname: credentialNickname,
                    RPID: this.config.rpid,
                    Origin: this.config.origin,
                }),
            });
            const res = await response.json();
            if (response.ok) {
                return res;
            }
            return { error: { ...res, from: "server" } };
        }
        /**
         * Sign in a user
         *
         * @param {SigninMethod} Object containing either UserID or Alias
         * @returns
         */
        async signin(signinMethod) {
            var _a;
            try {
                this.assertBrowserSupported();
                this.handleAbort();
                // if signinMethod is undefined, set it to an empty object
                // this will cause a login using discoverable credentials
                if (!signinMethod) {
                    signinMethod = { discoverable: true };
                }
                const signin = await this.signinBegin(signinMethod);
                if (signin.error) {
                    return signin;
                }
                signin.data.challenge = base64UrlToArrayBuffer(signin.data.challenge);
                (_a = signin.data.allowCredentials) === null || _a === void 0 ? void 0 : _a.forEach((cred) => {
                    cred.id = base64UrlToArrayBuffer(cred.id);
                });
                const credential = await navigator.credentials.get({
                    publicKey: signin.data,
                    mediation: 'autofill' in signinMethod ? "conditional" : undefined,
                    signal: this.abortController.signal,
                });
                const response = await this.signinComplete(credential, signin.session);
                return response;
            }
            catch (caughtError) {
                const errorMessage = getErrorMessage(caughtError);
                const error = {
                    from: "client",
                    errorCode: "unknown",
                    title: errorMessage,
                };
                console.error(caughtError);
                console.error(error);
                return { error };
            }
        }
        async signinBegin(signinMethod) {
            const response = await fetch(`${this.config.apiUrl}/signin/begin`, {
                method: 'POST',
                headers: this.createHeaders(),
                body: JSON.stringify({
                    userId: "userId" in signinMethod ? signinMethod.userId : undefined,
                    alias: "alias" in signinMethod ? signinMethod.alias : undefined,
                    RPID: this.config.rpid,
                    Origin: this.config.origin,
                }),
            });
            const res = await response.json();
            if (response.ok) {
                return res;
            }
            return { error: { ...res, from: "server" } };
        }
        async signinComplete(credential, session) {
            const assertionResponse = credential.response;
            const response = await fetch(`${this.config.apiUrl}/signin/complete`, {
                method: 'POST',
                headers: this.createHeaders(),
                body: JSON.stringify({
                    session: session,
                    response: {
                        id: credential.id,
                        rawId: arrayBufferToBase64Url(new Uint8Array(credential.rawId)),
                        type: credential.type,
                        extensions: credential.getClientExtensionResults(),
                        response: {
                            authenticatorData: arrayBufferToBase64Url(assertionResponse.authenticatorData),
                            clientDataJson: arrayBufferToBase64Url(assertionResponse.clientDataJSON),
                            signature: arrayBufferToBase64Url(assertionResponse.signature),
                        },
                    },
                    RPID: this.config.rpid,
                    Origin: this.config.origin,
                }),
            });
            const res = await response.json();
            if (response.ok) {
                return res;
            }
            return { error: { ...res, from: "server" } };
        }
        handleAbort() {
            this.abort();
            this.abortController = new AbortController();
        }
        assertBrowserSupported() {
            if (!isBrowserSupported()) {
                throw new Error('WebAuthn and PublicKeyCredentials are not supported on this browser/device');
            }
        }
        createHeaders() {
            return {
                ApiKey: this.config.apiKey,
                'Content-Type': 'application/json',
                'Client-Version': 'js-1.1.0'
            };
        }
    }
    async function isPlatformSupported() {
        if (!isBrowserSupported())
            return false;
        return PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    }
    function isBrowserSupported() {
        return window.PublicKeyCredential !== undefined && typeof window.PublicKeyCredential === 'function';
    }
    async function isAutofillSupported() {
        const PublicKeyCredential = window.PublicKeyCredential; // Typescript lacks support for this
        if (!PublicKeyCredential.isConditionalMediationAvailable)
            return false;
        return PublicKeyCredential.isConditionalMediationAvailable();
    }
    function base64ToBase64Url(base64) {
        return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=*$/g, '');
    }
    function base64UrlToBase64(base64Url) {
        return base64Url.replace(/-/g, '+').replace(/_/g, '/');
    }
    function base64UrlToArrayBuffer(base64UrlString) {
        // improvement: Remove BufferSource-type and add proper types upstream
        if (typeof base64UrlString !== 'string') {
            const msg = "Cannot convert from Base64Url to ArrayBuffer: Input was not of type string";
            console.error(msg, base64UrlString);
            throw new TypeError(msg);
        }
        const base64Unpadded = base64UrlToBase64(base64UrlString);
        const paddingNeeded = (4 - (base64Unpadded.length % 4)) % 4;
        const base64Padded = base64Unpadded.padEnd(base64Unpadded.length + paddingNeeded, "=");
        const binary = window.atob(base64Padded);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes;
    }
    function arrayBufferToBase64Url(buffer) {
        const uint8Array = (() => {
            if (Array.isArray(buffer))
                return Uint8Array.from(buffer);
            if (buffer instanceof ArrayBuffer)
                return new Uint8Array(buffer);
            if (buffer instanceof Uint8Array)
                return buffer;
            const msg = "Cannot convert from ArrayBuffer to Base64Url. Input was not of type ArrayBuffer, Uint8Array or Array";
            console.error(msg, buffer);
            throw new Error(msg);
        })();
        let string = '';
        for (let i = 0; i < uint8Array.byteLength; i++) {
            string += String.fromCharCode(uint8Array[i]);
        }
        const base64String = window.btoa(string);
        return base64ToBase64Url(base64String);
    }
    function isErrorWithMessage(error) {
        return (typeof error === 'object' &&
            error !== null &&
            'message' in error &&
            typeof error.message === 'string');
    }
    function toErrorWithMessage(maybeError) {
        if (isErrorWithMessage(maybeError))
            return maybeError;
        try {
            return new Error(JSON.stringify(maybeError));
        }
        catch (_a) {
            // fallback in case there's an error stringifying the maybeError
            // like with circular references for example.
            return new Error(String(maybeError));
        }
    }
    function getErrorMessage(error) {
        return toErrorWithMessage(error).message;
    }

    exports.Client = Client;
    exports.isAutofillSupported = isAutofillSupported;
    exports.isBrowserSupported = isBrowserSupported;
    exports.isPlatformSupported = isPlatformSupported;

})));
