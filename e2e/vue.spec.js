var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { test, expect } from '@playwright/test';
// See here how to get started:
// https://playwright.dev/docs/intro
test('visits the app root url', (_a) => __awaiter(void 0, [_a], void 0, function* ({ page }) {
    yield page.goto('/');
    yield expect(page.locator('div.greetings > h1')).toHaveText('You did it!');
}));
