import axios from 'axios';
import { ITEM_NUMBER_REGEX } from '../../api/constants';

export interface ExtractRawHtmlResult {
  html: string;
  id: string;
}

export async function extractRawHtml(url: string): Promise<ExtractRawHtmlResult> {
  const { data: html } = await axios(url);
  const id = url.toUpperCase().match(ITEM_NUMBER_REGEX)[0];
  return { id, html };
}

