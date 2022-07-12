import React, { FunctionComponent, useState, useMemo } from "react";
import {
  Input,
  Form,
  Row,
  Button,
} from 'antd';
import Paragraph from 'antd/lib/typography/Paragraph';

import {
    MAX_CREATOR_LIMIT,
    Creator
  } from '../../index';
import { ChangeNonprofit, CHANGE_BASE_URL } from "src/utils/change";
import Loading from "../Loading";
import { StyledCreatorsRow } from "../RoyaltiesCreators";
//@ts-ignore
import FeatherIcon from 'feather-icons-react';
import creatorStandinImg from '../../../../assets/images/creator-standin.png';
import { Debounce } from "src/utils/debounce";
import styled from 'styled-components';

const DEBOUNCE_INTERVAL_MS = 300;

interface Props {
    showDonationField: boolean;
    creators: Creator[];
    updateDonationFieldState: (show: React.SetStateAction<boolean>)=>void;
    updateCreatorState: (value: React.SetStateAction<Creator[]>)=>void;
    updateShowErrorState: (value: React.SetStateAction<boolean>)=>void;
}

const StyledSelectButton = styled(Paragraph)`
  margin-right: 5px;
  font-size: 14px;
  cursor: pointer;
  &:hover {
    opacity: 0.8;
  }
`;

const CharityRow = ({
    charity,
    onSelect
  }: {
    charity: ChangeNonprofit;
    onSelect: () => void;
  }) => {
    const {name, icon_url, crypto, description, ein} = charity;
    const {solana_address} = crypto;
    return (
      <div style={{ width: '100%' }}>
      <StyledCreatorsRow className="minter-charity-row">
        {icon_url ? (
          <img height={32} width={32} className="rounded-full" src={icon_url} alt={name + '-logo'} />
        ) : (
          <img height={32} width={32} className="rounded-full"  src={creatorStandinImg} alt="generic-logo" />
        )} 
        <Paragraph
          style={{
            margin: '0 14px 0 6px',
            maxWidth: 200,
            fontSize: 14,
            lineHeight: 1.2,
          }}
        >
          {charity.name}
  
  
        </Paragraph>
        <FeatherIcon
            className="creator-row-icon"
            icon="external-link"
            onClick={() => {window.open(CHANGE_BASE_URL + solana_address, "_blank")}}
          />
        <span style={{ marginLeft: 'auto' }}></span>
        <StyledSelectButton
          onClick={onSelect}
        >
          Select
        </StyledSelectButton>
  
  
        </StyledCreatorsRow>
  
        <Paragraph
          style={{ fontSize: 10, marginLeft:14, lineClamp: 4, textOverflow: 'ellipsis', overflow: 'hidden' }}
        >
          {description}
        </Paragraph>
        <Paragraph
          style={{ fontSize: 10, marginLeft:14 }}
          >
          EIN: {ein}
        </Paragraph>
        </div>
    );
  };


export const ChangeDonationField: FunctionComponent<Props> = ({
    showDonationField,
    creators,
    updateDonationFieldState,
    updateCreatorState,
    updateShowErrorState
  }: Props) => {
    const [searchResults, setSearchResults] = useState<ChangeNonprofit[]>([]);
    const [charityLoading, setLoading] = useState<boolean>(false);
    const [isTyping, setIsTyping] = useState<boolean>(false);
    const debounce = useMemo(() => new Debounce(), []);
  
    const addDonation = (nonProfit: ChangeNonprofit) => {
        if (creators.length >= MAX_CREATOR_LIMIT) {
          throw new Error('Max level of creators reached');
        }
        const existingCreators = creators.map((c) => c.address);
        const indexOfDuplicate = existingCreators.findIndex((a) => nonProfit.crypto.solana_address === a);
        if (indexOfDuplicate !== -1) {
          throw new Error('All creator hashes must be unique');
        }
        const newShareSplit = 98 / (creators.length + 1);
        updateCreatorState([
          ...creators.map((c) => ({ ...c, share: newShareSplit })),
          { address: nonProfit.crypto.solana_address, 
            share: newShareSplit,
            charityProps: {
              isCharity: true,
              displayName: nonProfit.name,
              imageUrl:nonProfit.icon_url
            } },
        ]);
        setSearchResults([]);
        updateDonationFieldState(false);
        updateShowErrorState(false);
      };
    const handleSearch = async (e: React.ChangeEvent<HTMLInputElement>) => {
              setIsTyping(true);
              debounce.debounceFcn(() => {
                if (e.target.value === '') {
                  setSearchResults([]);
                  setLoading(false);
                  setIsTyping(false);
                }
                else {performSearch(e.target.value)}
              }, DEBOUNCE_INTERVAL_MS)
            
        
          }
          const performSearch = (textToSearch: string) => {
            setLoading(true)
            const queryParams = new URLSearchParams()
            queryParams.append('search_term', textToSearch!)
            fetch(
              `https://api.getchange.io/api/v1/nonprofit_basics?${queryParams.toString()}`,
              {
                headers: {
                  'Content-Type': 'application/json',
                },
              }
            )
              .then((response) => response.json())
              .then((response) => {
                // Some nonprofits do not have crypto addresses; filter these out.
                return response.nonprofits.filter(
                  (n: ChangeNonprofit) => n.crypto !== undefined
                ) as ChangeNonprofit[]
              })
              .then((nonprofits) => {
                setSearchResults(nonprofits)
              })
              .catch(() => {
                console.error('error finding nonprofits')
              })
              .finally(() => {
                setIsTyping(false)
                setLoading(false)
              })
          }
  
    return (
        
        <>
        {showDonationField && (
            <Row>
              <Form.Item
                name="addDonation"
                style={{ width: '100%', marginBottom: '0px' }}
                rules={[
                  { required: true, message: 'Please enter a value' },
                  {
                    message: `You can only add ${MAX_CREATOR_LIMIT} creators`,
                    async validator() {
                      if (creators.length === MAX_CREATOR_LIMIT) {
                        throw new Error();
                      }
                    },
                  }
                ]}
              >
                <Input
                  id="charity-input"
                  style={{ margin: '39px 0 -2px', height: 50 }}
                  placeholder="Search for a nonprofit by name or EIN"
                  maxLength={44}
                  required
                  onChange={handleSearch}
                />
              </Form.Item>
    
    
            {/* render 1st two search results */}
            {(searchResults && searchResults.length > 0 || charityLoading || isTyping) && (
            <Row
             style={{ backgroundColor: '#262626', rowGap:'8px', position: 'relative', padding: '8px', width: '100%', maxHeight: '320px', overflowY: 'scroll' }}
            >
            {charityLoading || isTyping ? (
              <div
                style={{
                  position: 'absolute',
                  display: 'flex',
                  justifyContent: 'center',
                  backgroundColor: 'rgba(0, 0, 0, 0.5)',
                  alignItems: 'center',
                  inset: 0,
                }}
              >
                <Loading/>
              </div>
            ) : (
              ''
            )}

            {/* dummy div for spinner if no results */}
            {((charityLoading || isTyping) && searchResults.length === 0) && <Row
              style={{ backgroundColor: '#D9D9D91A', borderRadius: '3px', width: '100%', minHeight:'200px', margin: '10px 5px 5px 5px'}}
            >
              &nbsp;
            </Row>}
    
            {searchResults.map((result) => {
              return (
                <Row
                  style={{ backgroundColor: '#D9D9D91A', borderRadius: '3px', width: '100%' }}
                  key={result.name} 
                >
                <CharityRow
                  charity={result}
                  onSelect={()=>addDonation(result)}
                />
                </Row>
              )
            })}
    
            </Row>
            )}
    
              <Row>
                <Button
                  type="primary"
                  onClick={() => {updateDonationFieldState(false); setSearchResults([]);
                }}
                  style={{ marginTop: 10 }}
                >
                  Cancel
                </Button>
              </Row>
            </Row>
          )}
    </>)
}

