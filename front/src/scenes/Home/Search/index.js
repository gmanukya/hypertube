import React, { Component } from 'react';
import { connect } from 'react-redux'
import { Link } from 'react-router-dom';
import InfiniteScroll from 'react-infinite-scroller';

import { changeSearchSettings } from '../../../actions/me'

import { fetchWrap } from '../../../services/fetchWrap'

import './style.css';

const genresMovies = require('./genresMovies.json');
const genresTV = require('./genresTV.json');
const language = require('./language.json');

class Search extends Component {

	constructor(props) {
		super(props)
		this.state = {
			page: 1,
			result: [],
			lastApiCallTimestamp : 0,
			loading: true,
			scrolling: false
		}
		this.determineTypeOfSearch = this.determineTypeOfSearch.bind(this);
		this.scrolling = this.scrolling.bind(this);
		this.discover = this.discover.bind(this);
	}

	componentDidMount() {
		this._isMounted = true;
		this.determineTypeOfSearch();
	}

	componentDidUpdate(prevProps, prevState) {
		if (prevProps.searchSettings.search !== this.props.searchSettings.search) {
			this.setState({
				result: [],
				loading: true,
				page: 1
			}, () => this.determineTypeOfSearch())
		}
	}

	componentWillUnmount() {
		this._isMounted = false;
	}

	determineTypeOfSearch() {
		if (this.state.page && (this.state.loading || this.state.scrolling)) {
			var endPoint;
			if (this.props.searchSettings.search) {
				if (this.props.canal === 'tv') {
					endPoint = 'https://api.themoviedb.org/3/search/tv?api_key=fc97ca1225d5b618b7a69f5a20a132d8&query=' + this.props.searchSettings.search + '&page=' + this.state.page;
				}
				else {
					endPoint = 'https://api.themoviedb.org/3/search/movie?api_key=fc97ca1225d5b618b7a69f5a20a132d8&query=' + this.props.searchSettings.search + '&page=' + this.state.page;
				}
			}
			else if (this.props.canal === 'tv') {
				endPoint = 'https://api.themoviedb.org/3/discover/tv?api_key=fc97ca1225d5b618b7a69f5a20a132d8&sort_by=' + this.props.searchSettings.orderBy + '&first_air_date.gte=' + this.props.searchSettings.release_date_min + '&vote_count.gte=100&first_air_date.lte=' + (parseInt(this.props.searchSettings.release_date_max, 10) + 1) + '&page=' + this.state.page + '&vote_average.gte=' + this.props.searchSettings.ratings_min + '&vote_average.lte=' + this.props.searchSettings.ratings_max + '&with_genres=' + this.props.searchSettings.genres.join(',');
			}
			else {
				endPoint = 'https://api.themoviedb.org/3/discover/movie?api_key=fc97ca1225d5b618b7a69f5a20a132d8&sort_by=' + this.props.searchSettings.orderBy + '&page=' + this.state.page + '&vote_count.gte=600&primary_release_date.gte=' + this.props.searchSettings.release_date_min + '&primary_release_date.lte=' + (parseInt(this.props.searchSettings.release_date_max, 10) + 1) + '&vote_average.gte=' + this.props.searchSettings.ratings_min + '&vote_average.lte=' + this.props.searchSettings.ratings_max + '&with_genres=' + this.props.searchSettings.genres.join(',');
			}
			this.search(endPoint);
		}
	}

	search(endPoint) {
		const actualTimestamp = Date.now();
		this.setState({lastApiCallTimestamp: actualTimestamp}, () =>
		fetchWrap(endPoint)
		.then(data => {
			var result = [];
			var page = this.state.page + 1;
			if (data.total_results) {
				if (data.page <= data.total_pages) {
					result = this.state.result.concat(data.results);
				}
				else {
					result = this.state.result;
					page = 0;
				}
			}
			else {
				page = 0;
			}
			if (this._isMounted) {
				if (actualTimestamp === this.state.lastApiCallTimestamp) {
					this.setState({
						result,
						loading: false,
						scrolling: page < 3 ? true : false,
						page
					}, () => {
						if (this.state.page < 3) {
							this.determineTypeOfSearch()
						}
					})
				}
			}
		})
		.catch(error => console.log(error)));
	}

	discover(name, value) {
		if (name === 'genres') {
			if (value) {
				if (this.props.searchSettings.genres.includes(value)) {
					const genresCopy = this.props.searchSettings.genres;
					genresCopy.splice(genresCopy.indexOf(value), 1);
					value = genresCopy;
				}
				else {
					value = this.props.searchSettings.genres.concat(value);
				}
			}
			else {
				value = [];
			}
		}
		else if (name === 'release_date_min') {
			if (!value) {
				value = 1900;
			}
			else if (isNaN(value) || value < 1000) {
				value = '';
			}
		}
		else if (name === 'release_date_max') {
			if (!value) {
				value = 2018;
			}
			else if (isNaN(value) || value < 1000) {
				value = '';
			}
		}
		else if (name === 'ratings_min') {
			if (!value) {
				value = -1;
			}
			else if (isNaN(value)) {
				value = '';
			}
		}
		else if (name === 'ratings_max') {
			if (!value) {
				value = 10;
			}
			else if (isNaN(value)) {
				value = '';
			}
		}
		if (value) {
			this.props.dispatch(changeSearchSettings(name, value));
			this.setState({
				search: '',
				result: [],
				page: 1,
				loading: true
			}, () => this.determineTypeOfSearch())
		}
	}

	scrolling() {
		if (!this.state.scrolling && !this.state.loading) {
			this.setState({
				scrolling: true
			}, () => this.determineTypeOfSearch())
		}
	}

	render() {

		const movies = this.state.result
		.filter(elem => elem.poster_path)
		.map((item, key) =>
		this.props.canal === 'tv' ?
		<Link key={key} to={'/tv/' + item.id}>
			<div className='movie'>
				<div className='movieTitle'>
					<div>
						<div className='fontMedium underline'>
							{item.name ? <b>{item.name}</b> : null}
						</div>
						<div>
							{
								item.first_air_date
								?
								<b>({item.first_air_date.substring(0, 4)})</b>
								:
								null
							}
						</div>
						<div className='spaceTop'>
							{
								item.genre_ids
								?
								item.genre_ids
								.filter(id => genresTV[id])
								.map(id => ' ' + genresTV[id][this.props.me.language])
								:
								null
							}
						</div>
						<div className='spaceTop'>
							{
								item.vote_average
								?
								<span>{item.vote_average} <i className='fas fa-star'></i></span>
								:
								null
							}
						</div>
					</div>
				</div>
				{
					this.props.me.seenMovies && this.props.me.seenMovies.find(movie => movie.canal === this.props.canal && parseInt(movie.movieId, 10) === item.id)
					?
					<div className='seenMovieLogo'>
						<i className='fas fa-check'></i>
					</div>
					:
					null
				}
				<img className='movieImg' alt={item.title} src={'https://image.tmdb.org/t/p/w500' + item.poster_path} />
			</div>
		</Link>
		:
		<Link key={key} to={'/' + item.id}>
			<div className='movie'>
				<div className='movieTitle'>
					<div>
						<div className='fontMedium underline'>
							{
								item.title
								?
								<b>{item.title}</b>
								:
								null
							}
						</div>
						<div>
							{
								item.release_date
								?
								<b>({item.release_date.substring(0, 4)})</b>
								:
								null
							}
						</div>
						<div className='spaceTop'>
							{
								item.genre_ids
								?
								item.genre_ids
								.filter(id => genresMovies[id])
								.map(id => ' ' + genresMovies[id][this.props.me.language])
								:
								null
							}
						</div>
						<div className='spaceTop'>
							{
								item.vote_average
								?
								<span>{item.vote_average} <i className='fas fa-star'></i></span>
								:
								null
							}
						</div>
					</div>
				</div>
				{
					this.props.me.seenMovies && this.props.me.seenMovies.find(movie => movie.canal === this.props.canal && parseInt(movie.movieId, 10) === item.id)
					?
					<div className='seenMovieLogo'>
						<i className='fas fa-check'></i>
					</div>
					:
					null
				}
				<img className='movieImg' alt={item.title} src={'https://image.tmdb.org/t/p/w500' + item.poster_path} />
			</div>
		</Link>)

		return(
			<div className='main'>
				<InfiniteScroll
					loadMore={this.scrolling}
					hasMore={this.state.page ? true : false}
					useWindow={false}
					>
					<div className='searchMenu'>
						<div className='searchMenuLogoContainer'><i className='fas fa-bars'></i></div>
						<div className='searchMenuContent'>
							<div className='searchTitle'>
								{language.orderByLabel[this.props.me.language]}
							</div>

							<div className={this.props.searchSettings.orderBy === 'popularity.desc' ? 'searchChoiceActive' : 'searchChoice'} onClick={() => this.discover('orderBy', 'popularity.desc')}>{language.orderByPopularity[this.props.me.language]}</div>
							<div className={this.props.searchSettings.orderBy === 'vote_average.desc' ? 'searchChoiceActive' : 'searchChoice'} onClick={() => this.discover('orderBy', 'vote_average.desc')}>{language.orderByRating[this.props.me.language]}</div>
							<div className={this.props.searchSettings.orderBy === 'release_date.desc' ? 'searchChoiceActive' : 'searchChoice'} onClick={() => this.discover('orderBy', 'release_date.desc')}>{language.orderByReleaseDate[this.props.me.language]}</div>
							{
								this.props.canal !== 'tv'
								?
								<div>
									<div className={this.props.searchSettings.orderBy === 'revenue.desc' ? 'searchChoiceActive' : 'searchChoice'} onClick={() => this.discover('orderBy', 'revenue.desc')}>{language.orderByRevenue[this.props.me.language]}</div>
									<div className={this.props.searchSettings.orderBy === 'vote_count.desc' ? 'searchChoiceActive' : 'searchChoice'} onClick={() => this.discover('orderBy', 'vote_count.desc')}>{language.orderByVoteCount[this.props.me.language]}</div>
								</div>
								:
								null
							}
							<div className='searchTitle searchTitleLign'>
								{language.genreLabel[this.props.me.language]}
							</div>
							<div className={!this.props.searchSettings.genres.length ? 'searchChoiceActive' : 'searchChoice'} onClick={() => this.discover('genres')}>All</div>
							{
								this.props.canal === 'tv' ?
								Object.keys(genresTV)
								.sort((a, b) => genresTV[a][this.props.me.language].localeCompare(genresTV[b][this.props.me.language]))
								.map(elem =>
									<div key={elem} className={this.props.searchSettings.genres.includes(elem) ? 'searchChoiceActive' : 'searchChoice'} onClick={() => this.discover('genres', elem)}>{genresTV[elem][this.props.me.language]}</div>
								)
								:
								Object.keys(genresMovies)
								.sort((a, b) => genresMovies[a][this.props.me.language].localeCompare(genresMovies[b][this.props.me.language]))
								.map(elem =>
									<div key={elem} className={this.props.searchSettings.genres.includes(elem) ? 'searchChoiceActive' : 'searchChoice'} onClick={() => this.discover('genres', elem)}>{genresMovies[elem][this.props.me.language]}</div>
								)
							}
							<div className='searchTitle searchTitleLign'>
								{language.releaseYearLabel[this.props.me.language]}
							</div>
							<input
								name='release_date_min'
								type='text'
								placeholder='1900'
								className='searchRange spaceRight fontCenter'
								onChange={(event) => this.discover('release_date_min', event.target.value)}
								/>
							-
							<input
								name='release_date_max'
								type='text'
								placeholder={(new Date()).getFullYear()}
								className='searchRange spaceLeft fontCenter'
								onChange={(event) => this.discover('release_date_max', event.target.value)}
								/>
							<div className='searchTitle searchTitleLign'>
								{language.ratingLabel[this.props.me.language]}
							</div>
							<input
								name='ratings_min'
								type='text'
								placeholder='0'
								className='searchRange spaceRight fontCenter'
								onChange={(event) => this.discover('ratings_min', event.target.value)}
								/>
							-
							<input
								name='ratings_max'
								type='text'
								placeholder='10'
								className='searchRange spaceLeft fontCenter'
								onChange={(event) => this.discover('ratings_max', event.target.value)}
								/>
						</div>
					</div>
					<div className='searchMovies'>
						{
							this.state.loading ?
							<div className='loading noMovies'><span><i className='fas fa-spinner'></i></span></div>
							:
							movies.length ?
							<div>
								{movies}
							</div>
							:
							<div>
								<div className='noMovies'>
									<i className='fas fa-map-signs'></i>
								</div>
								{language.quickSearchUnavailable[this.props.me.language]}
							</div>
						}
					</div>
				</InfiniteScroll>
			</div>
		);
	}
}


function mapStateToProps(state) {
	const { me, searchSettings } = state.handleMe;
	return ({
		me,
		searchSettings
	})
}

export default connect(mapStateToProps)(Search)
